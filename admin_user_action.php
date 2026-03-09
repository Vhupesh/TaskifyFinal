<?php
// File: admin_user_action.php
session_start();

// Only admin
if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header("Location: login.php");
    exit;
}

require __DIR__ . '/config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: admin_dashboard.php");
    exit;
}

$adminId    = (int) $_SESSION['user_id'];
$userId     = isset($_POST['user_id']) ? (int) $_POST['user_id'] : 0;
$actionType = $_POST['actionType'] ?? '';

if ($userId <= 0) {
    $_SESSION['admin_message'] = "Invalid user ID.";
    $_SESSION['admin_message_type'] = "error";
    header("Location: admin_dashboard.php");
    exit;
}

// Do not allow admin to disable/delete themselves
if ($userId === $adminId && ($actionType === 'disable' || $actionType === 'delete')) {
    $_SESSION['admin_message'] = "You cannot disable or delete your own admin account.";
    $_SESSION['admin_message_type'] = "error";
    header("Location: admin_dashboard.php");
    exit;
}

switch ($actionType) {
    case 'disable':
        $stmt = $conn->prepare("UPDATE users SET status = 'disabled' WHERE id = ?");
        if ($stmt) {
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            if ($stmt->affected_rows > 0) {
                $_SESSION['admin_message'] = "User disabled successfully.";
                $_SESSION['admin_message_type'] = "success";
            } else {
                $_SESSION['admin_message'] = "User not found or already disabled.";
                $_SESSION['admin_message_type'] = "error";
            }
            $stmt->close();
        } else {
            $_SESSION['admin_message'] = "Database error: " . $conn->error;
            $_SESSION['admin_message_type'] = "error";
        }
        break;

    case 'enable':
        $stmt = $conn->prepare("UPDATE users SET status = 'active' WHERE id = ?");
        if ($stmt) {
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            if ($stmt->affected_rows > 0) {
                $_SESSION['admin_message'] = "User enabled successfully.";
                $_SESSION['admin_message_type'] = "success";
            } else {
                $_SESSION['admin_message'] = "User not found or already active.";
                $_SESSION['admin_message_type'] = "error";
            }
            $stmt->close();
        } else {
            $_SESSION['admin_message'] = "Database error: " . $conn->error;
            $_SESSION['admin_message_type'] = "error";
        }
        break;

    case 'delete':
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        if ($stmt) {
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            if ($stmt->affected_rows > 0) {
                $_SESSION['admin_message'] = "User and all their tasks deleted successfully.";
                $_SESSION['admin_message_type'] = "success";
            } else {
                $_SESSION['admin_message'] = "User not found.";
                $_SESSION['admin_message_type'] = "error";
            }
            $stmt->close();
        } else {
            $_SESSION['admin_message'] = "Database error: " . $conn->error;
            $_SESSION['admin_message_type'] = "error";
        }
        break;

    default:
        $_SESSION['admin_message'] = "Invalid action.";
        $_SESSION['admin_message_type'] = "error";
        break;
}

header("Location: admin_dashboard.php");
exit;
