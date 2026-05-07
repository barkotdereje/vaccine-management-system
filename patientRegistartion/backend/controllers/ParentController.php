<?php
// ==================== CORS & Error Reporting ====================
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
// ==================== Database Connection ====================
try {
    $pdo = new PDO("mysql:host=localhost;dbname=vaccine_ms;charset=utf8mb4", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    exit;
}

// ==================== Helper Functions ====================
function getPath() {
    return parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
}

/**
 * Auto‑assign a nurse to a child (round‑robin among active nurses)
 */
function assignNurse($pdo, $childId) {
    $stmt = $pdo->query("SELECT id FROM users WHERE role_id = 2 AND is_verified = 1 ORDER BY id");
    $nurses = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (empty($nurses)) return null;

    // Simple round‑robin: get last assigned nurse id and increment
    $last = $pdo->query("SELECT nurse_id FROM nurse_assignments ORDER BY id DESC LIMIT 1")->fetchColumn();
    $index = $last ? (array_search($last, $nurses) + 1) % count($nurses) : 0;
    $nurseId = $nurses[$index];

    $insert = $pdo->prepare("INSERT INTO nurse_assignments (child_id, nurse_id) VALUES (?, ?)");
    $insert->execute([$childId, $nurseId]);
    return $nurseId;
}

/**
 * Generate all future vaccination appointments for a child based on DOB
 * (Simplified version – only creates appointments for active vaccines)
 */
function generateAppointments($pdo, $childId, $dob) {
    $birthDate = new DateTime($dob);
    $stmt = $pdo->query("SELECT id, name, days_from_birth FROM vaccines WHERE is_active = 1 ORDER BY days_from_birth");
    $vaccines = $stmt->fetchAll();
    $today = new DateTime();

    foreach ($vaccines as $vaccine) {
        $dueDate = clone $birthDate;
        $dueDate->modify("+{$vaccine['days_from_birth']} days");
        if ($dueDate >= $today) {
            $insert = $pdo->prepare("
                INSERT INTO appointments (child_id, vaccine_id, vaccine_name, scheduled_date, status)
                VALUES (?, ?, ?, ?, 'pending')
            ");
            $insert->execute([$childId, $vaccine['id'], $vaccine['name'], $dueDate->format('Y-m-d')]);
        }
    }
}

// ==================== ROUTE: POST /auth/register (Parent Registration) ====================
$path = getPath();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && $path === '/auth/register') {
    $input = json_decode(file_get_contents('php://input'), true);
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $password = $input['password'] ?? '';
    $confirm = $input['confirm_password'] ?? '';

    if ($password !== $confirm) {
        echo json_encode(["success" => false, "message" => "Passwords do not match"]);
        exit;
    }
    if (!$name || !$email || !$phone || !$password) {
        echo json_encode(["success" => false, "message" => "All fields required"]);
        exit;
    }

    // Check if email or phone already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? OR phone = ?");
    $stmt->execute([$email, $phone]);
    if ($stmt->fetch()) {
        echo json_encode(["success" => false, "message" => "Email or phone already exists"]);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (name, email, phone, password_hash, role_id, is_verified) VALUES (?, ?, ?, ?, 1, 0)");
    if ($stmt->execute([$name, $email, $phone, $hash])) {
        echo json_encode(["success" => true, "message" => "Parent registered successfully. Awaiting nurse approval."]);
    } else {
        echo json_encode(["success" => false, "message" => "Registration failed"]);
    }
    exit;
}

// ==================== ROUTE: POST /children (Child Registration) ====================
if ($method === 'POST' && $path === '/children') {
    $input = json_decode(file_get_contents('php://input'), true);
    $parentId = $input['parent_id'] ?? null;
    $name = trim($input['name'] ?? '');
    $dob = $input['dob'] ?? '';
    $gender = $input['gender'] ?? 'Male';
    $bloodType = $input['blood_type'] ?? null;
    $allergies = $input['allergies'] ?? '';
    $birthWeight = isset($input['birth_weight']) ? (float)$input['birth_weight'] : null;
    $deliveryType = $input['delivery_type'] ?? null;
    $birthPlace = $input['birth_place'] ?? '';

    if (!$parentId || !$name || !$dob || !$gender) {
        echo json_encode(["success" => false, "message" => "parent_id, name, dob, gender are required"]);
        exit;
    }

    // Verify parent exists (optional – you may want to check)
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role_id = 1");
    $stmt->execute([$parentId]);
    if (!$stmt->fetch()) {
        echo json_encode(["success" => false, "message" => "Parent not found"]);
        exit;
    }

    // Generate unique child ID (e.g., CH-5F3A8B2C)
    $uniqueChildId = 'CH-' . strtoupper(substr(uniqid(), -8));

    $pdo->beginTransaction();
    try {
        // Insert child
        $insertChild = $pdo->prepare("
            INSERT INTO children 
            (parent_id, unique_child_id, name, dob, gender, blood_type, allergies, birth_weight, delivery_type, birth_place, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ");
        $insertChild->execute([
            $parentId, $uniqueChildId, $name, $dob, $gender,
            $bloodType, $allergies, $birthWeight, $deliveryType, $birthPlace
        ]);
        $childId = $pdo->lastInsertId();

        // Auto-assign a nurse
        assignNurse($pdo, $childId);

        // Generate future appointments
        generateAppointments($pdo, $childId, $dob);

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "child_id" => $childId,
            "unique_child_id" => $uniqueChildId,
            "message" => "Child registered successfully. Awaiting verification."
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Child registration failed: " . $e->getMessage()]);
    }
    exit;
}

// ==================== Not Found ====================
http_response_code(404);
echo json_encode(["success" => false, "message" => "Endpoint not found"]);