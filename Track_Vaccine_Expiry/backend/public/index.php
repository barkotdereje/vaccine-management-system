<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// ==================== PHPMailer ====================
require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/SMTP.php';
require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/Exception.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ==================== CORS ====================
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$static_file = __DIR__ . $path;
if (file_exists($static_file) && is_file($static_file) && $path !== '/index.php') {
    return false;
}

// ==================== Database ====================
try {
    $pdo = new PDO("mysql:host=localhost;dbname=vaccine_ms;charset=utf8mb4", "root", "root");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    exit;
}


function audit_log($pdo, $userId, $action, $details = '') {
    $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)");
    $stmt->execute([$userId, $action, $details, $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
}
// ==================== AUTHENTICATION ====================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $path === '/api/auth/login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    if (!$email || !$password) {
        echo json_encode(["success" => false, "message" => "Email and password required"]);
        exit;
    }
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
        echo json_encode(["success" => false, "message" => "Invalid credentials"]);
        exit;
    }
    $role = $user['role_id'] == 1 ? 'parent' : ($user['role_id'] == 2 ? 'nurse' : 'admin');
    $token = bin2hex(random_bytes(32));
    echo json_encode([
        "success" => true,
        "data" => [
            "token" => $token,
            "user" => [
                "id" => $user['id'],
                "name" => $user['name'],
                "email" => $user['email'],
                "role" => $role
            ]
        ]
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $path === '/api/auth/register') {
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

// ==================== EXPIRING BATCHES ====================
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $path === '/api/admin/expiring-batches') {
    $stmt = $pdo->query("
        SELECT v.name AS vaccine_name, i.batch_number, i.expiry_date, i.quantity
        FROM inventory i
        JOIN vaccines v ON i.vaccine_id = v.id
        WHERE i.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)
        ORDER BY i.expiry_date ASC
    ");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}
// ==================== CATCH-ALL ====================
if (strpos($path, '/api/') === 0) {
    echo json_encode(["success" => true, "message" => "Demo endpoint – implement later"]);
    exit;
}

// ==================== 404 ====================
http_response_code(404);
echo "Not Found";