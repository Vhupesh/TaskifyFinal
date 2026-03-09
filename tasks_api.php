<?php
session_start();
require __DIR__ . '/config/db.php';

header('Content-Type: application/json');

// Require login
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated.']);
    exit;
}

$user_id = (int) $_SESSION['user_id'];
$action  = $_GET['action'] ?? $_POST['action'] ?? 'list';

$allowedPriorities = ['low', 'medium', 'high'];
$allowedTags       = ['work', 'personal', 'urgent', 'ideas'];

function respond(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

switch ($action) {
    // ============================
    // READ: List tasks for user
    // ============================
    case 'list':
        $sql = "SELECT 
                    id,
                    title,
                    description,
                    priority,
                    due_date AS date,
                    tag,
                    completed,
                    starred
                FROM tasks
                WHERE user_id = ?
                ORDER BY completed ASC, due_date ASC, created_at DESC";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            respond(['success' => false, 'message' => 'Database error: ' . $conn->error], 500);
        }

        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $result = $stmt->get_result();

        $tasks = [];
        while ($row = $result->fetch_assoc()) {
            // Ensure booleans in JSON
            $row['completed'] = (bool) $row['completed'];
            $row['starred']   = (bool) $row['starred'];
            $tasks[] = $row;
        }

        $stmt->close();
        respond(['success' => true, 'tasks' => $tasks]);
        break;

    // ============================
    // CREATE: New task
    // ============================
    case 'create':
        $title       = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $priority    = $_POST['priority'] ?? 'medium';
        $date        = $_POST['date'] ?? '';
        $tag         = $_POST['tag'] ?? 'work';

        if ($title === '' || $date === '') {
            respond([
                'success' => false,
                'message' => 'Title and due date are required.'
            ], 400);
        }

        if (!in_array($priority, $allowedPriorities, true)) {
            $priority = 'medium';
        }
        if (!in_array($tag, $allowedTags, true)) {
            $tag = 'work';
        }

        $sql = "INSERT INTO tasks (user_id, title, description, priority, due_date, tag)
                VALUES (?, ?, ?, ?, ?, ?)";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            respond(['success' => false, 'message' => 'Database error: ' . $conn->error], 500);
        }

        $stmt->bind_param('isssss', $user_id, $title, $description, $priority, $date, $tag);

        if ($stmt->execute()) {
            $newId = $stmt->insert_id;
            $stmt->close();
            respond([
                'success' => true,
                'message' => 'Task created successfully.',
                'task_id' => $newId
            ]);
        } else {
            $stmt->close();
            respond(['success' => false, 'message' => 'Failed to create task.'], 500);
        }
        break;

    // ============================
    // UPDATE: Edit or toggle
    // ============================
    case 'update':
        $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
        if ($id <= 0) {
            respond(['success' => false, 'message' => 'Invalid task ID.'], 400);
        }

        $updates = [];
        $params  = [];
        $types   = '';

        if (isset($_POST['title'])) {
            $t = trim($_POST['title']);
            if ($t !== '') {
                $updates[] = 'title = ?';
                $params[]  = $t;
                $types    .= 's';
            }
        }

        if (isset($_POST['description'])) {
            $updates[] = 'description = ?';
            $params[]  = trim($_POST['description']);
            $types    .= 's';
        }

        if (isset($_POST['priority'])) {
            $p = $_POST['priority'];
            if (!in_array($p, $allowedPriorities, true)) {
                $p = 'medium';
            }
            $updates[] = 'priority = ?';
            $params[]  = $p;
            $types    .= 's';
        }

        if (isset($_POST['date'])) {
            $d = $_POST['date'];
            if ($d !== '') {
                $updates[] = 'due_date = ?';
                $params[]  = $d;
                $types    .= 's';
            }
        }

        if (isset($_POST['tag'])) {
            $t = $_POST['tag'];
            if (!in_array($t, $allowedTags, true)) {
                $t = 'work';
            }
            $updates[] = 'tag = ?';
            $params[]  = $t;
            $types    .= 's';
        }

        if (isset($_POST['completed'])) {
            $c = ($_POST['completed'] == 1) ? 1 : 0;
            $updates[] = 'completed = ?';
            $params[]  = $c;
            $types    .= 'i';
        }

        if (isset($_POST['starred'])) {
            $s = ($_POST['starred'] == 1) ? 1 : 0;
            $updates[] = 'starred = ?';
            $params[]  = $s;
            $types    .= 'i';
        }

        if (empty($updates)) {
            respond(['success' => false, 'message' => 'No fields to update.'], 400);
        }

        $sql = "UPDATE tasks SET " . implode(', ', $updates) . " 
                WHERE id = ? AND user_id = ?";

        $params[] = $id;
        $params[] = $user_id;
        $types   .= 'ii';

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            respond(['success' => false, 'message' => 'Database error: ' . $conn->error], 500);
        }

        $stmt->bind_param($types, ...$params);

        if ($stmt->execute()) {
            if ($stmt->affected_rows === 0) {
                $stmt->close();
                respond(['success' => false, 'message' => 'Task not found.'], 404);
            }
            $stmt->close();
            respond(['success' => true, 'message' => 'Task updated successfully.']);
        } else {
            $stmt->close();
            respond(['success' => false, 'message' => 'Failed to update task.'], 500);
        }
        break;

    // ============================
    // DELETE: Remove task
    // ============================
    case 'delete':
        $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
        if ($id <= 0) {
            respond(['success' => false, 'message' => 'Invalid task ID.'], 400);
        }

        $sql = "DELETE FROM tasks WHERE id = ? AND user_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            respond(['success' => false, 'message' => 'Database error: ' . $conn->error], 500);
        }

        $stmt->bind_param('ii', $id, $user_id);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            $stmt->close();
            respond(['success' => false, 'message' => 'Task not found.'], 404);
        }

        $stmt->close();
        respond(['success' => true, 'message' => 'Task deleted successfully.']);
        break;

    default:
        respond(['success' => false, 'message' => 'Invalid action.'], 400);
}
