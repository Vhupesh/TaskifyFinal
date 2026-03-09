<?php
session_start();
require __DIR__ . '/config/db.php';

$error = "";
$success = "";
$activeForm = 'signin';   // 'signin' or 'signup'
$signinEmail = "";

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $formType = $_POST['form_type'] ?? 'signin';

    // ---------- SIGN IN ----------
    if ($formType === 'signin') {
        $activeForm = 'signin';
        $email      = trim($_POST['email'] ?? '');
        $password   = $_POST['password'] ?? '';
        $signinEmail = $email;

        if ($email === '' || $password === '') {
            $error = "Please enter email and password.";
        } else {
            //$sql  = "SELECT id, name, email, password_hash, role FROM users WHERE email = ?";
            $sql  = "SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?";
            $stmt = $conn->prepare($sql);

            if ($stmt) {
                $stmt->bind_param("s", $email);
                $stmt->execute();
                $result = $stmt->get_result();
                $user = $result->fetch_assoc();

               /* if ($user && password_verify($password, $user['password_hash'])) {
                    // Login success
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['name']    = $user['name'];
                    $_SESSION['email']   = $user['email'];
                    $_SESSION['role']    = $user['role'];

                    if ($user['role'] === 'admin') {
                        header("Location: admin_dashboard.php");
                    } else {
                        header("Location: user_dashboard.php");
                    }
                    exit;
                } else {
                    $error = "Invalid email or password.";
                } */


                    if ($user && password_verify($password, $user['password_hash'])) {

    if ($user['status'] !== 'active') {
        // Account disabled by admin
        $error = "Your account has been disabled. Please contact the administrator.";
    } else {
        // Login success
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['name']    = $user['name'];
        $_SESSION['email']   = $user['email'];
        $_SESSION['role']    = $user['role'];

        if ($user['role'] === 'admin') {
            header("Location: admin_dashboard.php");
        } else {
            header("Location: user_dashboard.php");
        }
        exit;
    }

} else {
    $error = "Invalid email or password.";
}



                $stmt->close();
            } else {
                $error = "Database query error.";
            }
        }
    }

    // ---------- SIGN UP (REGISTER) ----------
    if ($formType === 'signup') {
        $activeForm = 'signup';

        $name     = trim($_POST['name'] ?? '');
        $email    = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $confirm  = $_POST['confirmPassword'] ?? '';

        // Basic server-side validation
        if ($name === '' || strlen($name) < 2) {
            $error = "Please enter a valid name (at least 2 characters).";
        } elseif ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = "Please enter a valid email address.";
        } elseif (strlen($password) < 6) {
            $error = "Password must be at least 6 characters.";
        } elseif ($password !== $confirm) {
            $error = "Passwords do not match.";
        } else {
            // Check if email already exists
            $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
            if ($stmt) {
                $stmt->bind_param("s", $email);
                $stmt->execute();
                $stmt->store_result();

                if ($stmt->num_rows > 0) {
                    $error = "An account with this email already exists.";
                } else {
                    // Insert new user as 'user' role
                    $stmt->close();
                    $hash = password_hash($password, PASSWORD_BCRYPT);

                    $stmt = $conn->prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')");
                    if ($stmt) {
                        $stmt->bind_param("sss", $name, $email, $hash);
                        if ($stmt->execute()) {
                            $success = "Account created successfully. Please sign in.";
                            $activeForm = 'signin';
                            $signinEmail = $email;
                        } else {
                            $error = "Failed to create account. Please try again.";
                        }
                        $stmt->close();
                    } else {
                        $error = "Database error while creating account.";
                    }
                }
            } else {
                $error = "Database error while checking email.";
            }
        }
    }
}

$showSignUp = ($activeForm === 'signup');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Taskify - Login</title>
  <link rel="stylesheet" href="login.css" />
</head>
<body>
  <main class="page">
    <section class="auth-card" aria-label="Taskify authentication">
      <!-- Left image panel -->
      <div class="auth-media" role="img" aria-label="Taskify cover image">
        <div class="media-overlay"></div>

        <div class="media-brand">
          <div class="brand-badge">T</div>
          <div class="brand-text">
            <div class="brand-name">Taskify</div>
            <div class="brand-tagline">Organize tasks. Boost productivity.</div>
          </div>
        </div>

        <div class="media-footer">
          <div class="media-title">Task Management System</div>
          <div class="media-subtitle">BCA 4th Semester (TU) Project</div>
        </div>
      </div>

      <!-- Right form panel -->
      <div class="auth-panel">
        <header class="auth-header">
          <h1 class="auth-title" id="formHeading">
            <?php echo $showSignUp ? "Create your account" : "Let’s sign you in"; ?>
          </h1>
          <p class="auth-subtitle" id="formSubheading">
            <?php echo $showSignUp ? "Sign up to start using Taskify" : "Sign in to your account"; ?>
          </p>
        </header>

        <!-- Error / success box -->
        <?php if ($error): ?>
          <div class="form-error show" id="formError" role="alert" aria-live="polite">
            <?php echo htmlspecialchars($error); ?>
          </div>
        <?php else: ?>
          <div class="form-error" id="formError" role="alert" aria-live="polite"></div>
        <?php endif; ?>

        <?php if ($success): ?>
          <div class="form-success" id="formSuccess" role="status" aria-live="polite"
               style="background:#dcfce7;color:#166534;border:1px solid #bbf7d0;padding:12px;border-radius:12px;font-size:14px;margin:10px 0 14px;">
            <?php echo htmlspecialchars($success); ?>
          </div>
        <?php endif; ?>

        <!-- SIGN IN -->
        <form class="auth-form <?php echo $showSignUp ? 'hidden' : ''; ?>"
              id="signInForm"
              autocomplete="on"
              novalidate
              method="POST"
              action="">
          <input type="hidden" name="form_type" value="signin" />

          <div class="form-group">
            <label for="signinEmail">Email</label>
            <input
              type="email"
              id="signinEmail"
              name="email"
              placeholder="Enter your email address"
              required
              autocomplete="email"
              value="<?php echo htmlspecialchars($signinEmail); ?>"
            />
          </div>

          <div class="form-group">
            <label for="signinPassword">Password</label>
            <div class="input-with-icon">
              <input
                type="password"
                id="signinPassword"
                name="password"
                placeholder="Enter your password"
                required
                autocomplete="current-password"
                minlength="6"
              />
              <button type="button" class="icon-btn" data-toggle-password="#signinPassword" aria-label="Show password">
                <!-- eye icon -->
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-row">
            <a class="link" href="#" id="forgotPasswordLink">Forgot Password?</a>
          </div>

          <button type="submit" class="primary-btn">Sign In</button>

          <p class="switch-text">
            Don’t have an account?
            <button type="button" class="link-btn" id="showSignUpBtn">Sign up</button>
          </p>
        </form>

        <!-- SIGN UP -->
        <form class="auth-form <?php echo $showSignUp ? '' : 'hidden'; ?>"
              id="signUpForm"
              autocomplete="on"
              novalidate
              method="POST"
              action="">
          <input type="hidden" name="form_type" value="signup" />

          <div class="form-group">
            <label for="signupName">Name</label>
            <input
              type="text"
              id="signupName"
              name="name"
              placeholder="Enter your full name"
              required
              autocomplete="name"
              minlength="2"
            />
          </div>

          <div class="form-group">
            <label for="signupEmail">Email</label>
            <input
              type="email"
              id="signupEmail"
              name="email"
              placeholder="Enter your email address"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label for="signupPassword">Password</label>
            <div class="input-with-icon">
              <input
                type="password"
                id="signupPassword"
                name="password"
                placeholder="Create a password"
                required
                minlength="6"
                autocomplete="new-password"
              />
              <button type="button" class="icon-btn" data-toggle-password="#signupPassword" aria-label="Show password">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="signupConfirmPassword">Confirm Password</label>
            <div class="input-with-icon">
              <input
                type="password"
                id="signupConfirmPassword"
                name="confirmPassword"
                placeholder="Confirm your password"
                required
                minlength="6"
                autocomplete="new-password"
              />
              <button type="button" class="icon-btn" data-toggle-password="#signupConfirmPassword" aria-label="Show password">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" class="primary-btn">Create Account</button>

          <p class="switch-text">
            Already have an account?
            <button type="button" class="link-btn" id="showSignInBtn">Sign in</button>
          </p>

        </form>

        <footer class="auth-footer">
          <span>© <span id="year"></span> Taskify</span>
        </footer>
      </div>
    </section>
  </main>

  <script src="login.js"></script>
</body>
</html>
