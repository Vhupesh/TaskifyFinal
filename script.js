// ============================================
// WAIT FOR PAGE TO LOAD
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded!');
    initApp();
});

// ============================================
// TASK MANAGEMENT SYSTEM (DB-backed)
// ============================================
const TASKS_API_URL = 'tasks_api.php';

let tasks = [];
let currentFilter = 'all';
let editingTaskId = null;

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Load tasks from server (READ)
async function loadTasks() {
    try {
        const response = await fetch(TASKS_API_URL + '?action=list', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data.success) {
            tasks = data.tasks || [];
        } else {
            console.error('Failed to load tasks:', data.message);
            tasks = [];
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasks = [];
    }
    updateUI();
}

// Create task on server (CREATE)
async function createTaskOnServer(taskData) {
    try {
        const formData = new FormData();
        formData.append('action', 'create');
        formData.append('title', taskData.title);
        formData.append('description', taskData.description || '');
        formData.append('priority', taskData.priority);
        formData.append('date', taskData.date);
        formData.append('tag', taskData.tag);

        const response = await fetch(TASKS_API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!data.success) {
            alert('Failed to create task: ' + (data.message || 'Unknown error'));
        } else {
            alert('Task created successfully!');
        }
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Error creating task. Please try again.');
    }
    await loadTasks();
}

// Update task on server (UPDATE)
async function updateTaskOnServer(id, fields) {
    try {
        const formData = new FormData();
        formData.append('action', 'update');
        formData.append('id', id);

        Object.keys(fields).forEach(key => {
            formData.append(key, fields[key]);
        });

        const response = await fetch(TASKS_API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!data.success) {
            alert('Failed to update task: ' + (data.message || 'Unknown error'));
        } else {
            // Only show message for full edits (not for every checkbox/star click)
            if (fields.title || fields.description || fields.date || fields.priority || fields.tag) {
                alert('Task updated successfully!');
            }
        }
    } catch (error) {
        console.error('Error updating task:', error);
        alert('Error updating task. Please try again.');
    }
    await loadTasks();
}

// Delete task on server (DELETE)
async function deleteTaskOnServer(id) {
    const confirmDelete = confirm('Are you sure you want to delete this task?');
    if (!confirmDelete) return;

    try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', id);

        const response = await fetch(TASKS_API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!data.success) {
            alert('Failed to delete task: ' + (data.message || 'Unknown error'));
        } else {
            alert('Task deleted successfully.');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Error deleting task. Please try again.');
    }
    await loadTasks();
}

// Open modal in edit mode
function openEditTask(task) {
    const modal = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const dateInput = document.getElementById('taskDate');

    if (!modal || !taskForm || !task) return;

    editingTaskId = task.id;

    const titleInput = document.getElementById('taskTitle');
    const descInput = document.getElementById('taskDescription');
    const priorityInput = document.getElementById('taskPriority');
    const tagInput = document.getElementById('taskTag');

    if (titleInput) titleInput.value = task.title || '';
    if (descInput) descInput.value = task.description || '';
    if (priorityInput) priorityInput.value = task.priority || 'medium';
    if (dateInput) dateInput.value = task.date || getTodayDate();
    if (tagInput) tagInput.value = task.tag || 'work';

    const modalTitle = modal.querySelector('.modal-header h2');
    const primaryBtn = modal.querySelector('.btn-primary');
    if (modalTitle) modalTitle.textContent = 'Edit Task';
    if (primaryBtn) primaryBtn.textContent = 'Update Task';

    modal.classList.add('active');
    if (titleInput) titleInput.focus();
}

// ============================================
// INITIALIZE APP
// ============================================
function initApp() {
    setupUserProfile();
    setupHeader();
    setupSidebar();
    setupModal();
    loadTasks(); // will call updateUI() when done
    console.log('App initialized!');
}

// ============================================
// POMODORO TIMER (unchanged, uses localStorage)
// ============================================
let pomodoroInterval = null;
let pomodoroSeconds = 25 * 60; // 25 minutes
let isPomodorRunning = false;
let pomodoroCount = parseInt(localStorage.getItem('pomodoroCount')) || 0;

const pomodoroModes = {
    focus: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
};

function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroSeconds / 60);
    const seconds = pomodoroSeconds % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) timerDisplay.textContent = display;
    
    const countDisplay = document.getElementById('pomodoroCount');
    if (countDisplay) countDisplay.textContent = pomodoroCount;
}

function startPomodoro() {
    if (isPomodorRunning) return;
    
    isPomodorRunning = true;
    const startBtn = document.getElementById('startTimer');
    const pauseBtn = document.getElementById('pauseTimer');
    if (startBtn) startBtn.disabled = true;
    if (pauseBtn) pauseBtn.disabled = false;
    
    pomodoroInterval = setInterval(() => {
        pomodoroSeconds--;
        updatePomodoroDisplay();
        
        if (pomodoroSeconds <= 0) {
            stopPomodoro();
            pomodoroCount++;
            localStorage.setItem('pomodoroCount', pomodoroCount);
            updatePomodoroDisplay();
            alert('🎉 Pomodoro completed! Time for a break!');
        }
    }, 1000);
}

function pausePomodoro() {
    isPomodorRunning = false;
    clearInterval(pomodoroInterval);
    const startBtn = document.getElementById('startTimer');
    const pauseBtn = document.getElementById('pauseTimer');
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = true;
}

function resetPomodoro() {
    pausePomodoro();
    const activeModeBtn = document.querySelector('.mode-btn.active');
    const activeMode = activeModeBtn ? activeModeBtn.dataset.mode : 'focus';
    pomodoroSeconds = pomodoroModes[activeMode] || pomodoroModes.focus;
    updatePomodoroDisplay();
}

function stopPomodoro() {
    pausePomodoro();
    resetPomodoro();
}

const pomodoroCard = document.getElementById('pomodoroCard');
const pomodoroModal = document.getElementById('pomodoroModal');
const closePomodoroModal = document.getElementById('closePomodoroModal');

if (pomodoroCard) {
    pomodoroCard.onclick = () => {
        if (pomodoroModal) {
            pomodoroModal.classList.add('active');
            updatePomodoroDisplay();
        }
    };
}

if (closePomodoroModal && pomodoroModal) {
    closePomodoroModal.onclick = () => {
        pomodoroModal.classList.remove('active');
        pausePomodoro();
    };
}

if (pomodoroModal) {
    pomodoroModal.onclick = (e) => {
        if (e.target === pomodoroModal) {
            pomodoroModal.classList.remove('active');
            pausePomodoro();
        }
    };
}

const startTimer = document.getElementById('startTimer');
const pauseTimer = document.getElementById('pauseTimer');
const resetTimer = document.getElementById('resetTimer');

if (startTimer) startTimer.onclick = startPomodoro;
if (pauseTimer) pauseTimer.onclick = pausePomodoro;
if (resetTimer) resetTimer.onclick = resetPomodoro;

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.onclick = function() {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const mode = this.dataset.mode;
        pomodoroSeconds = pomodoroModes[mode] || pomodoroModes.focus;
        
        const labels = {
            focus: 'Focus Time',
            short: 'Short Break',
            long: 'Long Break'
        };
        
        const timerLabel = document.getElementById('timerLabel');
        if (timerLabel) timerLabel.textContent = labels[mode] || 'Focus Time';
        
        pausePomodoro();
        updatePomodoroDisplay();
    };
});

updatePomodoroDisplay();

// ============================================
// EXPORT TASKS (works with DB-loaded tasks)
// ============================================
function exportTasksAsJSON() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taskify-tasks-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function exportTasksAsCSV() {
    let csv = 'Title,Description,Priority,Due Date,Tag,Status\n';
    
    tasks.forEach(task => {
        const row = [
            `"${task.title}"`,
            `"${task.description || ''}"`,
            task.priority,
            task.date,
            task.tag,
            task.completed ? 'Completed' : 'Pending'
        ];
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taskify-tasks-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
    exportBtn.onclick = () => {
        const choice = confirm('Export as CSV?\n\nOK = CSV\nCancel = JSON');
        if (choice) {
            exportTasksAsCSV();
        } else {
            exportTasksAsJSON();
        }
    };
}

// ============================================
// USER PROFILE (keeps using localStorage)
// ============================================
function setupUserProfile() {
    let userName = localStorage.getItem('userName');
    if (!userName) {
        userName = 'User';
    }
    
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.textContent = userName.charAt(0).toUpperCase();
        profileBtn.onclick = function() {
            const newName = prompt('Enter your new name:', userName);
            if (newName && newName.trim()) {
                localStorage.setItem('userName', newName.trim());
                this.textContent = newName.charAt(0).toUpperCase();
            }
        };
    }
}

// ============================================
// HEADER BUTTONS
// ============================================
function setupHeader() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.onclick = () => sidebar.classList.toggle('closed');
    }
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.onclick = function() {
            const query = prompt('Search tasks:');
            if (query) {
                const results = tasks.filter(t => 
                    t.title.toLowerCase().includes(query.toLowerCase())
                );
                alert(`Found ${results.length} task(s)`);
            }
        };
    }
    
    const notifBtn = document.getElementById('notificationBtn');
    if (notifBtn) {
        notifBtn.onclick = function() {
            const todayStr = getTodayDate();
            const overdue = tasks.filter(t => !t.completed && t.date < todayStr).length;
            const today = tasks.filter(t => !t.completed && t.date === todayStr).length;
            alert(`📋 ${today} tasks due today\n⚠️ ${overdue} overdue tasks`);
        };
    }
    
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
        }
        
        themeBtn.onclick = function() {
            this.style.transform = 'rotate(180deg)';
            setTimeout(() => this.style.transform = 'rotate(0deg)', 300);
            
            document.body.classList.toggle('dark-mode');
            
            if (document.body.classList.contains('dark-mode')) {
                localStorage.setItem('darkMode', 'enabled');
            } else {
                localStorage.setItem('darkMode', 'disabled');
            }
        };
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.onclick = function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        };
    });
}

// ============================================
// METRICS & STATS
// ============================================
function updateMetrics() {
    const today = getTodayDate();
    
    const todayTasks = tasks.filter(t => t.date === today && !t.completed).length;
    const metricTodayEl = document.getElementById('metricToday');
    if (metricTodayEl) metricTodayEl.textContent = todayTasks;
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const weekTasks = tasks.filter(t => t.date >= weekStartStr);
    const weekCompleted = weekTasks.filter(t => t.completed).length;
    const weekProgress = weekTasks.length > 0 ? Math.round((weekCompleted / weekTasks.length) * 100) : 0;
    
    const metricWeeklyEl = document.getElementById('metricWeekly');
    if (metricWeeklyEl) metricWeeklyEl.textContent = weekProgress + '%';
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const recentTasks = tasks.filter(t => t.date >= sevenDaysStr);
    const recentCompleted = recentTasks.filter(t => t.completed).length;
    const productivity = recentTasks.length > 0 ? Math.round((recentCompleted / recentTasks.length) * 100) : 0;
    
    const metricProductivityEl = document.getElementById('metricProductivity');
    if (metricProductivityEl) metricProductivityEl.textContent = productivity + '%';
    
    let streak = calculateStreak();
    const metricStreakEl = document.getElementById('metricStreak');
    if (metricStreakEl) metricStreakEl.textContent = streak + ' days';
}

function calculateStreak() {
    if (tasks.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    
    for (let i = 0; i < 30; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayTasks = tasks.filter(t => t.date === dateStr);
        const dayCompleted = dayTasks.filter(t => t.completed);
        
        if (dayTasks.length > 0 && dayCompleted.length > 0) {
            streak++;
        } else if (i > 0) {
            break;
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
}

// ============================================
// SIDEBAR
// ============================================
function setupSidebar() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.onclick = function() {
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const text = this.textContent.toLowerCase();
            if (text.includes('today')) currentFilter = 'today';
            else if (text.includes('important')) currentFilter = 'important';
            else if (text.includes('completed')) currentFilter = 'completed';
            else currentFilter = 'all';
            
            updateUI();
        };
    });
    
    const tagItems = document.querySelectorAll('.tag-item');
    tagItems.forEach(item => {
        item.onclick = function() {
            const tag = this.textContent.trim().toLowerCase();
            currentFilter = `tag-${tag}`;
            updateUI();
        };
    });
}

// ============================================
// MODAL (CREATE / EDIT TASK)
// ============================================
function setupModal() {
    const modal = document.getElementById('taskModal');
    const newTaskBtn = document.querySelector('.new-task-btn');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelTask');
    const taskForm = document.getElementById('taskForm');
    const dateInput = document.getElementById('taskDate');
    const modalTitle = modal ? modal.querySelector('.modal-header h2') : null;
    const primaryBtn = modal ? modal.querySelector('.btn-primary') : null;
    
    if (!modal || !newTaskBtn || !taskForm) {
        console.error('Modal elements not found!');
        return;
    }
    
    if (dateInput) dateInput.value = getTodayDate();
    
    // Open modal in create mode
    newTaskBtn.onclick = function() {
        editingTaskId = null;
        taskForm.reset();
        if (dateInput) dateInput.value = getTodayDate();
        if (modalTitle) modalTitle.textContent = 'Create New Task';
        if (primaryBtn) primaryBtn.textContent = 'Create Task';
        modal.classList.add('active');
        const titleInput = document.getElementById('taskTitle');
        if (titleInput) titleInput.focus();
    };
    
    // Close modal
    const closeModalFn = () => {
        modal.classList.remove('active');
        taskForm.reset();
        if (dateInput) dateInput.value = getTodayDate();
        editingTaskId = null;
        if (modalTitle) modalTitle.textContent = 'Create New Task';
        if (primaryBtn) primaryBtn.textContent = 'Create Task';
    };
    
    if (closeBtn) closeBtn.onclick = closeModalFn;
    if (cancelBtn) cancelBtn.onclick = closeModalFn;
    modal.onclick = (e) => {
        if (e.target === modal) closeModalFn();
    };
    
    // Submit form (create or update)
    taskForm.onsubmit = function(e) {
        e.preventDefault();
        
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value || '';
        const priority = document.getElementById('taskPriority').value;
        const date = document.getElementById('taskDate').value;
        const tag = document.getElementById('taskTag').value;
        
        if (!title) {
            alert('Please enter a task title.');
            return;
        }
        if (!date) {
            alert('Please select a due date.');
            return;
        }

        const taskData = { title, description, priority, date, tag };

        if (editingTaskId) {
            updateTaskOnServer(editingTaskId, taskData);
        } else {
            createTaskOnServer(taskData);
        }
        
        closeModalFn();
    };
    
    // Filter dropdown
    const filterSelect = document.querySelector('.task-filter');
    if (filterSelect) {
        filterSelect.onchange = function() {
            const value = this.value.toLowerCase();
            currentFilter = value === 'all tasks' ? 'all' : value;
            updateUI();
        };
    }
}

// ============================================
// UPDATE UI
// ============================================
function updateUI() {
    updateStats();
    updateSidebarCounts();
    updateMetrics();
    renderTasks();
    renderCharts();
}

function updateStats() {
    const today = getTodayDate();
    
    const todayTasks = tasks.filter(t => t.date === today && !t.completed);
    const todayCompleted = tasks.filter(t => t.date === today && t.completed);
    const todayTotal = todayTasks.length + todayCompleted.length;
    const todayProgress = todayTotal > 0 ? Math.round((todayCompleted.length / todayTotal) * 100) : 0;
    
    const todayCountEl = document.getElementById('todayCount');
    const todayProgressEl = document.getElementById('todayProgress');
    const todayBarEl = document.getElementById('todayProgressBar');
    
    if (todayCountEl) todayCountEl.textContent = todayTasks.length;
    if (todayProgressEl) todayProgressEl.textContent = todayProgress + '%';
    if (todayBarEl) todayBarEl.style.width = todayProgress + '%';
    
    const overdue = tasks.filter(t => t.date < today && !t.completed);
    const overdueEl = document.getElementById('overdueCount');
    if (overdueEl) overdueEl.textContent = overdue.length;
    
    const completed = tasks.filter(t => t.completed);
    const completedProgress = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
    
    const completedCountEl = document.getElementById('completedCount');
    const completedProgressEl = document.getElementById('completedProgress');
    const completedBarEl = document.getElementById('completedProgressBar');
    
    if (completedCountEl) completedCountEl.textContent = completed.length;
    if (completedProgressEl) completedProgressEl.textContent = completedProgress + '%';
    if (completedBarEl) completedBarEl.style.width = completedProgress + '%';
}

function updateSidebarCounts() {
    const today = getTodayDate();
    const todayCount = tasks.filter(t => t.date === today && !t.completed).length;
    const importantCount = tasks.filter(t => t.starred && !t.completed).length;
    const completedCount = tasks.filter(t => t.completed).length;
    
    document.querySelectorAll('.sidebar-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        const countSpan = item.querySelector('.count');
        if (!countSpan) return;
        
        if (text.includes('today')) countSpan.textContent = todayCount;
        else if (text.includes('important')) countSpan.textContent = importantCount;
        else if (text.includes('completed')) countSpan.textContent = completedCount;
    });
}

function renderTasks() {
    const taskList = document.querySelector('.task-list');
    if (!taskList) return;
    
    let filtered = [...tasks];
    const today = getTodayDate();
    
    if (currentFilter === 'today') {
        filtered = tasks.filter(t => t.date === today);
    } else if (currentFilter === 'important') {
        filtered = tasks.filter(t => t.starred);
    } else if (currentFilter === 'completed') {
        filtered = tasks.filter(t => t.completed);
    } else if (currentFilter.startsWith('tag-')) {
        const tag = currentFilter.replace('tag-', '');
        filtered = tasks.filter(t => t.tag === tag);
    }
    
    filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(a.date) - new Date(b.date);
    });
    
    taskList.innerHTML = '';
    
    if (filtered.length === 0) {
        taskList.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">No tasks found. Create one!</p>';
        return;
    }
    
    filtered.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        const priorityClass = task.priority;
        const dateObj = new Date(task.date);
        const dateStr = !isNaN(dateObj) 
            ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : task.date;
        const isStarred = !!task.starred;
        
        div.innerHTML = `
            <div class="task-checkbox">
                <input type="checkbox" id="task-${task.id}" ${task.completed ? 'checked' : ''}>
                <label for="task-${task.id}"></label>
            </div>
            <div class="task-content">
                <h4>${task.title}</h4>
                <p>${task.description || 'No description'}</p>
                <div class="task-meta">
                    <span class="priority ${priorityClass}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        </svg>
                        ${task.priority}
                    </span>
                    <span class="task-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${dateStr}
                    </span>
                    <span class="task-tag">${task.tag}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-edit" title="Edit task">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                    </svg>
                </button>
                <button class="task-star" title="Mark as important">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${isStarred ? '#f59e0b' : 'none'}" stroke="${isStarred ? '#f59e0b' : '#9ca3af'}" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
                <button class="task-delete" title="Delete task">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6l-1 14H6L5 6"></path>
                        <path d="M10 11v6"></path>
                        <path d="M14 11v6"></path>
                        <path d="M9 6V4h6v2"></path>
                    </svg>
                </button>
            </div>
        `;
        
        const checkbox = div.querySelector('.task-checkbox input');
        if (checkbox) {
            checkbox.onchange = function() {
                const newCompleted = this.checked ? 1 : 0;
                updateTaskOnServer(task.id, { completed: newCompleted });
            };
        }
        
        const starBtn = div.querySelector('.task-star');
        if (starBtn) {
            starBtn.onclick = function() {
                const newStarred = task.starred ? 0 : 1;
                updateTaskOnServer(task.id, { starred: newStarred });
            };
        }
        
        const deleteBtn = div.querySelector('.task-delete');
        if (deleteBtn) {
            deleteBtn.onclick = function() {
                deleteTaskOnServer(task.id);
            };
        }
        
        const editBtn = div.querySelector('.task-edit');
        if (editBtn) {
            editBtn.onclick = function() {
                openEditTask(task);
            };
        }
        
        taskList.appendChild(div);
    });
}

// ============================================
// CHARTS (unchanged, but now based on DB tasks)
// ============================================
let completionChart = null;
let priorityChart = null;
let weeklyChart = null;

function renderCharts() {
    renderCompletionChart();
    renderPriorityChart();
    renderWeeklyChart();
}

function renderCompletionChart() {
    const completed = tasks.filter(t => t.completed).length;
    const incomplete = tasks.filter(t => !t.completed).length;
    
    const options = {
        series: [completed, incomplete],
        chart: {
            type: 'donut',
            height: 250,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
        },
        labels: ['Completed', 'Incomplete'],
        colors: ['#10b981', '#f59e0b'],
        legend: {
            position: 'bottom',
            fontSize: '14px',
        },
        dataLabels: {
            enabled: true,
            style: {
                fontSize: '14px',
                fontWeight: 600,
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total Tasks',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#6b7280',
                            formatter: function () {
                                return tasks.length;
                            }
                        },
                        value: {
                            fontSize: '24px',
                            fontWeight: 700,
                            color: '#1f2937',
                        }
                    }
                }
            }
        }
    };
    
    if (completionChart) {
        completionChart.destroy();
    }
    
    const chartEl = document.querySelector("#completionChart");
    if (chartEl) {
        completionChart = new ApexCharts(chartEl, options);
        completionChart.render();
    }
}

function renderPriorityChart() {
    const high = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    const medium = tasks.filter(t => t.priority === 'medium' && !t.completed).length;
    const low = tasks.filter(t => t.priority === 'low' && !t.completed).length;
    
    const options = {
        series: [{
            name: 'Tasks',
            data: [high, medium, low]
        }],
        chart: {
            type: 'bar',
            height: 250,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
            toolbar: {
                show: false
            }
        },
        plotOptions: {
            bar: {
                borderRadius: 8,
                horizontal: false,
                columnWidth: '60%',
                distributed: true,
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: ['High', 'Medium', 'Low'],
            labels: {
                style: {
                    fontSize: '14px',
                    fontWeight: 500,
                }
            }
        },
        yaxis: {
            title: {
                text: 'Number of Tasks',
                style: {
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280'
                }
            }
        },
        colors: ['#ef4444', '#f59e0b', '#0891b2'],
        legend: {
            show: false
        },
        grid: {
            borderColor: '#e5e7eb',
        }
    };
    
    if (priorityChart) {
        priorityChart.destroy();
    }
    
    const chartEl = document.querySelector("#priorityChart");
    if (chartEl) {
        priorityChart = new ApexCharts(chartEl, options);
        priorityChart.render();
    }
}

function renderWeeklyChart() {
    const days = [];
    const completedArr = [];
    const createdArr = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        days.push(dayName);
        
        const completedCount = tasks.filter(t => 
            t.completed && t.date === dateStr
        ).length;
        
        const createdCount = tasks.filter(t => 
            t.date === dateStr
        ).length;
        
        completedArr.push(completedCount);
        createdArr.push(createdCount);
    }
    
    const options = {
        series: [
            {
                name: 'Tasks Created',
                data: createdArr
            },
            {
                name: 'Tasks Completed',
                data: completedArr
            }
        ],
        chart: {
            type: 'area',
            height: 300,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
            toolbar: {
                show: false
            },
            zoom: {
                enabled: false
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        colors: ['#0891b2', '#10b981'],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: days,
            labels: {
                style: {
                    fontSize: '12px',
                    fontWeight: 600,
                    colors: '#6b7280'
                }
            }
        },
        yaxis: {
            title: {
                text: 'Number of Tasks',
                style: {
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280'
                }
            },
            labels: {
                style: {
                    fontSize: '12px',
                    colors: '#6b7280'
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontSize: '14px',
            fontWeight: 600,
        },
        grid: {
            borderColor: '#e5e7eb',
            strokeDashArray: 4,
        },
        tooltip: {
            y: {
                formatter: function(value) {
                    return value + ' tasks';
                }
            }
        }
    };
    
    if (weeklyChart) {
        weeklyChart.destroy();
    }
    
    const chartEl = document.querySelector("#weeklyChart");
    if (chartEl) {
        weeklyChart = new ApexCharts(chartEl, options);
        weeklyChart.render();
    }
}
