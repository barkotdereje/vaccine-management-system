<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// ==================== CORS (same as original) ====================
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

// ==================== Parent Registration ====================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/api/auth/register') {
    $input = json_decode(file_get_contents('php://input'), true);
    $name = $input['name'] ?? '';
    $email = $input['email'] ?? '';
    $phone = $input['phone'] ?? '';
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

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? OR phone = ?");
    $stmt->execute([$email, $phone]);
    if ($stmt->fetch()) {
        echo json_encode(["success" => false, "message" => "Email or phone already exists"]);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (name, email, phone, password_hash, role_id) VALUES (?, ?, ?, ?, 1)");
    if ($stmt->execute([$name, $email, $phone, $hash])) {
        echo json_encode(["success" => true, "message" => "Registered. Awaiting nurse approval."]);
    } else {
        echo json_encode(["success" => false, "message" => "Registration failed"]);
    }
    exit;
}

// ==================== Child Registration ====================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/api/children') {
    $input = json_decode(file_get_contents('php://input'), true);
    $uniqueId = 'CH-' . strtoupper(uniqid());   // generates e.g. CH-5F3A8B2C

    $stmt = $pdo->prepare("
        INSERT INTO children 
        (parent_id, unique_child_id, name, dob, gender, blood_type, allergies, birth_weight, delivery_type, birth_place, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
    ");
    $stmt->execute([
        $input['parent_id'],
        $uniqueId,
        $input['name'],
        $input['dob'],
        $input['gender'],
        $input['blood_type'] ?? null,
        $input['allergies'] ?? '',
        $input['birth_weight'] ?? null,
        $input['delivery_type'] ?? 'Normal',
        $input['birth_place'] ?? ''
    ]);

    echo json_encode(["success" => true, "child_id" => $pdo->lastInsertId()]);
    exit;
}

// If any other request hits this script (optional)
http_response_code(404);
echo "Not Found";