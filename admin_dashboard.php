<?php
session_start();

// Only admin can access
if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header("Location: login.php");
    exit;
}

require __DIR__ . '/config/db.php';

// -------- Stats for top cards --------
$totalUsers     = 0;
$activeUsers    = 0;
$disabledUsers  = 0;
$totalTasks     = 0;
$completedTasks = 0;

// Total users
$res = $conn->query("SELECT COUNT(*) AS c FROM users");
if ($res) {
    $row = $res->fetch_assoc();
    $totalUsers = (int) $row['c'];
}

// Active users
$res = $conn->query("SELECT COUNT(*) AS c FROM users WHERE status = 'active'");
if ($res) {
    $row = $res->fetch_assoc();
    $activeUsers = (int) $row['c'];
}

// Disabled users
$res = $conn->query("SELECT COUNT(*) AS c FROM users WHERE status = 'disabled'");
if ($res) {
    $row = $res->fetch_assoc();
    $disabledUsers = (int) $row['c'];
}

// Tasks stats (if tasks table exists)
if ($conn->query("SHOW TABLES LIKE 'tasks'")->num_rows > 0) {
    $res = $conn->query("
        SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_count
        FROM tasks
    ");
    if ($res) {
        $row = $res->fetch_assoc();
        $totalTasks     = (int) $row['total'];
        $completedTasks = (int) ($row['completed_count'] ?? 0);
    }
}

// -------- List of users with task counts --------
$users = [];
$sql = "
    SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.created_at,
        COUNT(t.id) AS task_count,
        SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) AS completed_task_count
    FROM users u
    LEFT JOIN tasks t ON u.id = t.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
";

$res = $conn->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $row['task_count']           = (int) $row['task_count'];
        $row['completed_task_count'] = (int) ($row['completed_task_count'] ?? 0);
        $users[] = $row;
    }
}

// Flash messages from admin_user_action.php
$flashMessage = $_SESSION['admin_message'] ?? '';
$flashType    = $_SESSION['admin_message_type'] ?? ''; // 'success' or 'error'
unset($_SESSION['admin_message'], $_SESSION['admin_message_type']);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Taskify - Admin Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="admin.css">
</head>
<body>
<header class="admin-header">
    <div class="admin-header-inner">
        <div class="admin-logo">
            <div class="logo-badge">T</div>
            <div class="logo-text-group">
                <span class="logo-title">Taskify Admin</span>
                <span class="logo-subtitle">User Management Panel</span>
            </div>
        </div>
        <nav class="admin-nav">
            <span class="welcome-text">Welcome, <?= htmlspecialchars($_SESSION['name']) ?></span>
            <a href="user_dashboard.php" class="nav-link">My Tasks</a>
            <a href="logout.php" class="nav-link nav-link-danger">Logout</a>
        </nav>
    </div>
</header>

<main class="admin-main">
    <section class="admin-container">
        <h1 class="page-title">Admin Dashboard</h1>
        <p class="page-subtitle">Manage users and monitor Taskify usage.</p>

        <?php if ($flashMessage): ?>
            <div class="flash-message <?= $flashType === 'error' ? 'flash-error' : 'flash-success' ?>">
                <?= htmlspecialchars($flashMessage) ?>
            </div>
        <?php endif; ?>

        <!-- Stats Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Users</div>
                <div class="stat-value"><?= $totalUsers ?></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Active Users</div>
                <div class="stat-value"><?= $activeUsers ?></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Disabled Users</div>
                <div class="stat-value"><?= $disabledUsers ?></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Tasks</div>
                <div class="stat-value"><?= $totalTasks ?></div>
                <div class="stat-subvalue"><?= $completedTasks ?> completed</div>
            </div>
        </div>

        <!-- Users Table -->
        <section class="users-section">
            <div class="users-header">
                <h2>Users</h2>
                <p>Enable, disable or remove users. Tasks are deleted with the user.</p>
            </div>

            <div class="table-wrapper">
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name &amp; Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Tasks</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if (empty($users)): ?>
                        <tr>
                            <td colspan="7" class="empty-cell">No users found.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($users as $user): ?>
                            <tr>
                                <td><?= (int) $user['id'] ?></td>
                                <td>
                                    <div class="user-name"><?= htmlspecialchars($user['name']) ?></div>
                                    <div class="user-email"><?= htmlspecialchars($user['email']) ?></div>
                                </td>
                                <td>
                                    <span class="badge badge-role-<?= htmlspecialchars($user['role']) ?>">
                                        <?= htmlspecialchars(ucfirst($user['role'])) ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge badge-status-<?= htmlspecialchars($user['status']) ?>">
                                        <?= htmlspecialchars(ucfirst($user['status'])) ?>
                                    </span>
                                </td>
                                <td>
                                    <div class="task-count">
                                        <?= $user['task_count'] ?> total
                                        <?php if ($user['completed_task_count'] > 0): ?>
                                            <span class="task-count-completed">
                                                (<?= $user['completed_task_count'] ?> completed)
                                            </span>
                                        <?php endif; ?>
                                    </div>
                                </td>
                                <td>
                                    <?= htmlspecialchars(date('Y-m-d', strtotime($user['created_at']))) ?>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <?php if ($user['id'] != $_SESSION['user_id']): ?>
                                            <?php if ($user['status'] === 'active'): ?>
                                                <form method="POST" action="admin_user_action.php" class="inline-form">
                                                    <input type="hidden" name="user_id" value="<?= (int) $user['id'] ?>">
                                                    <input type="hidden" name="actionType" value="disable">
                                                    <button type="submit" class="btn btn-warning"
                                                            onclick="return confirm('Disable this user? They will not be able to log in.');">
                                                        Disable
                                                    </button>
                                                </form>
                                            <?php else: ?>
                                                <form method="POST" action="admin_user_action.php" class="inline-form">
                                                    <input type="hidden" name="user_id" value="<?= (int) $user['id'] ?>">
                                                    <input type="hidden" name="actionType" value="enable">
                                                    <button type="submit" class="btn btn-success">
                                                        Enable
                                                    </button>
                                                </form>
                                            <?php endif; ?>

                                            <form method="POST" action="admin_user_action.php" class="inline-form">
                                                <input type="hidden" name="user_id" value="<?= (int) $user['id'] ?>">
                                                <input type="hidden" name="actionType" value="delete">
                                                <button type="submit" class="btn btn-danger"
                                                        onclick="return confirm('Delete this user and all their tasks? This cannot be undone.');">
                                                    Delete
                                                </button>
                                            </form>
                                        <?php else: ?>
                                            <span class="self-note">You (admin)</span>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </section>
    </section>
</main>
</body>
</html>
