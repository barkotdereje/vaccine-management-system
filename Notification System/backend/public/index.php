<?php 

error_reporting(E_ALL);
ini_set('display_errors', 1);

// ==================== PHPMailer ====================
// require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/PHPMailer.php';
// require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/SMTP.php';
// require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/Exception.php';
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
}// ==================== CRON: SEND APPOINTMENT REMINDERS (REAL EMAIL) ====================

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $path === '/api/cron/send-reminders') {

    // ============ CONFIGURATION (REAL CREDENTIALS) ============
    $emailUsername = 'kaletamene90@gmail.com';
    $emailPassword = 'qgqs vlfz hbre idsn';   // Your Gmail App Password
    $clinicName    = 'Menatabiya Health Center';
    $clinicAddress = 'Debre Birhan, Menatabiya, Kebele 04';
    // =========================================================

    $totalSent = 0;

    // ---------- 3-DAY REMINDER ----------
    $in3days = date('Y-m-d', strtotime('+3 days'));
    $stmt = $pdo->prepare("
        SELECT a.id AS appt_id, a.scheduled_date, c.name AS child_name,
               u.email AS parent_email, u.phone AS parent_phone, v.name AS vaccine_name
        FROM appointments a
        JOIN children c ON a.child_id = c.id
        JOIN users u ON c.parent_id = u.id
        JOIN vaccines v ON a.vaccine_id = v.id
        WHERE a.scheduled_date = ? AND a.status = 'pending'
          AND a.id NOT IN (SELECT appointment_id FROM sent_notifications WHERE notification_type = 'reminder_3day')
    ");
    $stmt->execute([$in3days]);
    $threeDayAppts = $stmt->fetchAll();

    foreach ($threeDayAppts as $appt) {
        // ----- REAL EMAIL -----
        try {
            $mail = new PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = $emailUsername;
            $mail->Password   = $emailPassword;
            $mail->SMTPSecure = 'tls';
            $mail->Port       = 587;
            $mail->setFrom($emailUsername, $clinicName);
            $mail->addAddress($appt['parent_email']);
            $mail->isHTML(true);
            $mail->Subject = "Vaccination Reminder - {$appt['child_name']}";
            $mail->Body    = "
                <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:10px;'>
                    <h3 style='color:#1a5276;'>$clinicName</h3>
                    <p>Dear Parent,</p>
                    <p>Your child <strong>{$appt['child_name']}</strong> has a <strong>{$appt['vaccine_name']}</strong> vaccination on <strong>{$appt['scheduled_date']}</strong>.</p>
                    <p>Location: $clinicAddress</p>
                    <p>Please bring the vaccination card.</p>
                </div>";
            $mail->send();

            $pdo->prepare("INSERT INTO sent_notifications (appointment_id, notification_type, channel, sent_to, content, status)
                           VALUES (?, 'reminder_3day', 'email', ?, ?, 'sent')")
                ->execute([$appt['appt_id'], $appt['parent_email'], $mail->Body]);
            $totalSent++;
        } catch (Exception $e) {
            $pdo->prepare("INSERT INTO sent_notifications (appointment_id, notification_type, channel, sent_to, content, status, error_message)
                           VALUES (?, 'reminder_3day', 'email', ?, ?, 'failed', ?)")
                ->execute([$appt['appt_id'], $appt['parent_email'], '', $e->getMessage()]);
        }

        // Log SMS as simulated
        $pdo->prepare("INSERT INTO sent_notifications (appointment_id, notification_type, channel, sent_to, content, status)
                       VALUES (?, 'reminder_3day', 'sms', ?, ?, 'sent')")
            ->execute([$appt['appt_id'], $appt['parent_phone'], "Reminder SMS"]);
    }

    // ---------- DAY-OF REMINDER ----------
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("
        SELECT a.id AS appt_id, a.scheduled_date, c.name AS child_name,
               u.email AS parent_email, u.phone AS parent_phone, v.name AS vaccine_name
        FROM appointments a
        JOIN children c ON a.child_id = c.id
        JOIN users u ON c.parent_id = u.id
        JOIN vaccines v ON a.vaccine_id = v.id
        WHERE a.scheduled_date = ? AND a.status = 'pending'
          AND a.id NOT IN (SELECT appointment_id FROM sent_notifications WHERE notification_type = 'reminder_dayof')
    ");
    $stmt->execute([$today]);
    $todayAppts = $stmt->fetchAll();

    foreach ($todayAppts as $appt) {
        // ----- REAL EMAIL -----
        try {
            $mail = new PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = $emailUsername;
            $mail->Password   = $emailPassword;
            $mail->SMTPSecure = 'tls';
            $mail->Port       = 587;
            $mail->setFrom($emailUsername, $clinicName);
            $mail->addAddress($appt['parent_email']);
            $mail->isHTML(true);
            $mail->Subject = "APPOINTMENT TODAY - {$appt['child_name']}";
            $mail->Body    = "
                <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:2px solid #e74c3c;border-radius:10px;'>
                    <h3 style='color:#e74c3c;'>📅 APPOINTMENT TODAY</h3>
                    <p>Dear Parent,</p>
                    <p>Your child <strong>{$appt['child_name']}</strong> has a <strong>{$appt['vaccine_name']}</strong> vaccination <strong>TODAY ({$appt['scheduled_date']})</strong>.</p>
                    <p>Location: $clinicAddress</p>
                    <p>Please come now!</p>
                </div>";
            $mail->send();

            $pdo->prepare("INSERT INTO sent_notifications (appointment_id, notification_type, channel, sent_to, content, status)
                           VALUES (?, 'reminder_dayof', 'email', ?, ?, 'sent')")
                ->execute([$appt['appt_id'], $appt['parent_email'], $mail->Body]);
            $totalSent++;
        } catch (Exception $e) {
            $pdo->prepare("INSERT INTO sent_notifications (appointment_id, notification_type, channel, sent_to, content, status, error_message)
                           VALUES (?, 'reminder_dayof', 'email', ?, ?, 'failed', ?)")
                ->execute([$appt['appt_id'], $appt['parent_email'], '', $e->getMessage()]);
        }

        // Log SMS as simulated
        $pdo->prepare("INSERT INTO sent_notifications (appointment_id, notification_type, channel, sent_to, content, status)
                       VALUES (?, 'reminder_dayof', 'sms', ?, ?, 'sent')")
            ->execute([$appt['appt_id'], $appt['parent_phone'], "Day-of SMS"]);
    }

    echo json_encode(["success" => true, "message" => "Reminders processed. $totalSent emails sent successfully."]);
    exit;
}

// ==================== PARENT NOTIFICATION HISTORY ====================
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $path === '/api/parent/notification-history') {
    $parentId = isset($_GET['parent_id']) ? (int)$_GET['parent_id'] : 0;
    $stmt = $pdo->prepare("
        SELECT sn.*, a.scheduled_date, v.name AS vaccine_name, c.name AS child_name
        FROM sent_notifications sn
        JOIN appointments a ON sn.appointment_id = a.id
        JOIN children c ON a.child_id = c.id
        JOIN vaccines v ON a.vaccine_id = v.id
        WHERE c.parent_id = ?
        ORDER BY sn.sent_at DESC LIMIT 50
    ");
    $stmt->execute([$parentId]);
    echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

// ==================== MARK MISSED APPOINTMENTS (daily cron) ====================
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $path === '/api/cron/mark-missed') {
    $stmt = $pdo->prepare("UPDATE appointments SET status = 'missed' WHERE status = 'pending' AND scheduled_date < CURDATE()");
    $stmt->execute();
    $missedCount = $stmt->rowCount();
    echo json_encode(["success" => true, "message" => "Marked $missedCount appointments as missed"]);
    exit;
}