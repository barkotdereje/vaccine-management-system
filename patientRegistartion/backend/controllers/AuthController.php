<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../helpers/Logger.php';
require_once __DIR__ . '/../helpers/JwtHelper.php';

class AuthController {
    private $userModel;
    public function __construct() { $this->userModel = new User(); }

    public function login() {
        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        if (!$email || !$password) {
            Response::badRequest('Email and password required');
        }

        $user = $this->userModel->findByEmail($email);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::unauthorized('Invalid credentials');
        }

        // Parent must be verified
        if ($user['role_id'] == 1 && !$user['is_verified']) {
            Response::forbidden('Account pending nurse approval');
        }

        $role = $user['role_id'] == 1 ? 'parent' : ($user['role_id'] == 2 ? 'nurse' : 'admin');
        $payload = [
            'user_id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $role
        ];
        $token = JwtHelper::encode($payload);
        Logger::info("User logged in", $user['id']);
        Response::success([
            'token' => $token,
            'user' => $payload
        ]);
    }

    public function register() {
        $input = json_decode(file_get_contents('php://input'), true);
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $password = $input['password'] ?? '';
        $confirm = $input['confirm_password'] ?? '';

        if (!$name || !$email || !$phone || !$password) {
            Response::badRequest('All fields required');
        }
        if (!Validator::email($email)) Response::badRequest('Invalid email');
        if (!Validator::ethiopianPhone($phone)) Response::badRequest('Phone must be 10 digits starting 09');
        if (!Validator::strongPassword($password)) Response::badRequest('Password must be 8+ chars, include letter, number, symbol');
        if ($password !== $confirm) Response::badRequest('Passwords do not match');
        if ($this->userModel->findByEmail($email) || $this->userModel->findByPhone($phone)) {
            Response::conflict('Email or phone already exists');
        }

        $userId = $this->userModel->create($name, $email, $phone, $password);
        Logger::info("Parent registered", $userId);
        Response::created(['user_id' => $userId], 'Registration successful. Awaiting nurse approval.');
    }
}
?>