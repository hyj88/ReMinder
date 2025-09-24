// app.js

// --- API 配置 ---
// 注意：在 Docker 容器中，后端和前端同源（都在 localhost:5000 上由 Flask 提供），所以可以直接用相对路径。
// 如果是前后端分离部署，则需要配置具体的 API 基础 URL。
const API_BASE_URL = '/api';

// --- DOM 元素获取 ---
const form = document.getElementById('reminder-form');
const formContainer = document.getElementById('form-container');
const formTitle = document.getElementById('form-title');
const remindersList = document.getElementById('reminders-list');
const noDataMessage = document.getElementById('no-data-message');
const loadingSpinner = document.getElementById('loading-spinner'); // <-- 新增
const cancelEditBtn = document.getElementById('cancel-edit');
const showFormBtn = document.getElementById('show-form-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const importCsvFileInput = document.getElementById('import-csv-file');
const importCsvBtn = document.getElementById('import-csv-btn');

// --- 新增：登录相关 DOM 元素获取 ---
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
// --- 新增结束 ---

// --- 新增：密码管理和邮箱配置相关 DOM 元素获取 ---
const showChangePasswordBtn = document.getElementById('show-change-password-btn');
const changePasswordContainer = document.getElementById('change-password-container');
const changePasswordForm = document.getElementById('change-password-form');
const cancelChangePasswordBtn = document.getElementById('cancel-change-password');

const showEmailConfigBtn = document.getElementById('show-email-config-btn');
const emailConfigContainer = document.getElementById('email-config-container');
const emailConfigForm = document.getElementById('email-config-form');
const sendTestEmailBtn = document.getElementById('send-test-email-btn');
const checkAndSendEmailBtn = document.getElementById('check-and-send-email-btn');
const cancelEmailConfigBtn = document.getElementById('cancel-email-config');

const showDingtalkConfigBtn = document.getElementById('show-dingtalk-config-btn');
const dingtalkConfigContainer = document.getElementById('dingtalk-config-container');
const dingtalkConfigForm = document.getElementById('dingtalk-config-form');
const sendTestDingtalkBtn = document.getElementById('send-test-dingtalk-btn');
const checkAndSendDingtalkBtn = document.getElementById('check-and-send-dingtalk-btn');
const cancelDingtalkConfigBtn = document.getElementById('cancel-dingtalk-config');
// --- 新增结束 ---

// --- 常量 ---
const SESSION_KEY_LOGGED_IN = 'reminderAppIsLoggedIn';

// 状态统计元素
const totalCountElement = document.getElementById('total-count');
const warningCountElement = document.getElementById('warning-count');
const expiredCountElement = document.getElementById('expired-count');

// 编辑状态标识和当前编辑项ID
let isEditing = false;
let currentEditId = null;

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    // 确保初始密码已设置
    initializePassword();
    
    // 检查是否已登录
    if (checkLoginStatus()) {
        showApp(); // 显示主应用
        loadReminders(); // 加载数据
        setupEventListeners(); // 设置事件监听器
        setupEmailEventListeners(); // <-- 新增
        fetchEmailConfig(); // <-- 新增：登录后获取邮箱配置
        setupAutoRefresh(); // <-- 新增：设置自动刷新
        // checkAndAlertUpcomingReminders(); // 可以在 loadReminders 回调中调用
    } else {
        showLogin(); // 显示登录界面
        setupLoginListener(); // 只设置登录监听器
    }
});

// 存储已绑定的事件监听器，防止重复绑定
const boundEventListeners = new Set();

// --- 事件监听器 ---
function setupEventListeners() {
    // 清理之前可能绑定的事件监听器
    cleanupEventListeners();
    
    // 为表单元素添加事件监听器（这些不会重复创建，所以可以安全添加）
    document.getElementById('endDate').addEventListener('change', calculateActualReminderDate);
    document.getElementById('advanceDays').addEventListener('input', calculateActualReminderDate);
    
    // 自动续期选项的事件监听
    const autoRenewCheckbox = document.getElementById('autoRenew');
    const renewPeriodGroup = document.getElementById('renewPeriodGroup');
    
    if (autoRenewCheckbox && renewPeriodGroup) {
        autoRenewCheckbox.addEventListener('change', function() {
            renewPeriodGroup.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    // 为动态创建的按钮添加事件监听器
    addEventListenerOnce(form, 'submit', handleFormSubmit);
    addEventListenerOnce(cancelEditBtn, 'click', cancelEdit);
    
    addEventListenerOnce(showFormBtn, 'click', () => {
        showForm();
        if (isEditing) {
            cancelEdit();
        }
    });

    // --- 密码管理和邮箱配置事件监听 ---
    addEventListenerOnce(showChangePasswordBtn, 'click', showChangePasswordForm);
    addEventListenerOnce(cancelChangePasswordBtn, 'click', hideChangePasswordForm);
    addEventListenerOnce(showEmailConfigBtn, 'click', showEmailConfigForm);
    addEventListenerOnce(cancelEmailConfigBtn, 'click', hideEmailConfigForm);
    addEventListenerOnce(showDingtalkConfigBtn, 'click', showDingtalkConfigForm);
    addEventListenerOnce(cancelDingtalkConfigBtn, 'click', hideDingtalkConfigForm);

    // --- CSV 导入/导出事件监听 ---
    addEventListenerOnce(exportCsvBtn, 'click', exportRemindersToCSV);
    if (importCsvBtn && importCsvFileInput) {
        addEventListenerOnce(importCsvBtn, 'click', () => importRemindersFromCSV(importCsvFileInput));
    }

    // --- 登录相关按钮事件监听 ---
    addEventListenerOnce(logoutBtn, 'click', handleLogout);
    
    // --- 邮箱配置和密码管理相关表单事件监听 ---
    addEventListenerOnce(emailConfigForm, 'submit', handleSaveEmailConfig);
    addEventListenerOnce(dingtalkConfigForm, 'submit', handleSaveDingtalkConfig);
    addEventListenerOnce(changePasswordForm, 'submit', handleChangePassword);
    
    // --- 邮件发送相关按钮事件监听 ---
    addEventListenerOnce(sendTestEmailBtn, 'click', handleSendTestEmail);
    addEventListenerOnce(sendTestDingtalkBtn, 'click', handleSendTestDingtalk);
    
    // --- 提醒发送相关按钮事件监听 ---
    addEventListenerOnce(checkAndSendEmailBtn, 'click', handleCheckAndSendEmail);
    addEventListenerOnce(checkAndSendDingtalkBtn, 'click', handleCheckAndSendDingtalk);
    
    // --- 自动续期按钮事件监听 ---
    const autoRenewBtn = document.getElementById('auto-renew-btn');
    addEventListenerOnce(autoRenewBtn, 'click', handleAutoRenew);
}

/**
 * 添加事件监听器，避免重复绑定
 * @param {Element} element - 要添加监听器的元素
 * @param {string} event - 事件名称
 * @param {Function} handler - 事件处理函数
 */
function addEventListenerOnce(element, event, handler) {
    if (!element) return;
    
    const key = `${element.id || element.tagName}-${event}`;
    if (!boundEventListeners.has(key)) {
        element.addEventListener(event, handler);
        boundEventListeners.add(key);
    }
}

/**
 * 清理事件监听器
 */
function cleanupEventListeners() {
    boundEventListeners.clear();
}

function showForm() {
    formContainer.style.display = 'block';
    showFormBtn.style.display = 'none';
    // 隐藏其他表单
    changePasswordContainer.style.display = 'none';
    emailConfigContainer.style.display = 'none';
    showChangePasswordBtn.style.display = 'inline-block';
    showEmailConfigBtn.style.display = 'inline-block';
    formContainer.scrollIntoView({ behavior: 'smooth' });
}

function hideForm() {
    formContainer.style.display = 'none';
    showFormBtn.style.display = 'inline-block';
}

// --- 新增：密码管理和邮箱配置 UI 控制 ---
function showChangePasswordForm() {
    changePasswordContainer.style.display = 'block';
    showChangePasswordBtn.style.display = 'none';
    // 隐藏其他表单
    formContainer.style.display = 'none';
    emailConfigContainer.style.display = 'none';
    dingtalkConfigContainer.style.display = 'none';
    showFormBtn.style.display = 'inline-block';
    showEmailConfigBtn.style.display = 'inline-block';
    showDingtalkConfigBtn.style.display = 'inline-block';
    changePasswordContainer.scrollIntoView({ behavior: 'smooth' });
}

function hideChangePasswordForm() {
    changePasswordContainer.style.display = 'none';
    showChangePasswordBtn.style.display = 'inline-block';
    changePasswordForm.reset();
}

function showEmailConfigForm() {
    emailConfigContainer.style.display = 'block';
    showEmailConfigBtn.style.display = 'none';
    // 隐藏其他表单
    formContainer.style.display = 'none';
    changePasswordContainer.style.display = 'none';
    dingtalkConfigContainer.style.display = 'none';
    showFormBtn.style.display = 'inline-block';
    showChangePasswordBtn.style.display = 'inline-block';
    showDingtalkConfigBtn.style.display = 'inline-block';
    emailConfigContainer.scrollIntoView({ behavior: 'smooth' });
}

function hideEmailConfigForm() {
    emailConfigContainer.style.display = 'none';
    showEmailConfigBtn.style.display = 'inline-block';
    // 注意：通常不清空邮箱配置表单，因为用户可能只是想临时关闭
    // emailConfigForm.reset(); 
}

function showDingtalkConfigForm() {
    dingtalkConfigContainer.style.display = 'block';
    showDingtalkConfigBtn.style.display = 'none';
    // 隐藏其他表单
    formContainer.style.display = 'none';
    changePasswordContainer.style.display = 'none';
    emailConfigContainer.style.display = 'none';
    showFormBtn.style.display = 'inline-block';
    showChangePasswordBtn.style.display = 'inline-block';
    showEmailConfigBtn.style.display = 'inline-block';
    
    // 获取并显示最新的钉钉配置
    fetchDingtalkConfig();
    
    dingtalkConfigContainer.scrollIntoView({ behavior: 'smooth' });
}

function hideDingtalkConfigForm() {
    dingtalkConfigContainer.style.display = 'none';
    showDingtalkConfigBtn.style.display = 'inline-block';
    // 注意：通常不清空钉钉配置表单，因为用户可能只是想临时关闭
    // dingtalkConfigForm.reset(); 
}
// --- 新增结束 ---

// --- 新增：显示/隐藏加载中指示器 ---
function showLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }
}

function hideLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}
// --- 新增结束 ---

// --- 表单处理 ---
function handleFormSubmit(e) {
    e.preventDefault();
    const formData = getFormData();

    if (isEditing) {
        updateReminder(currentEditId, formData);
    } else {
        addReminder(formData);
    }
}

function getFormData() {
    const formData = {
        // 注意：ID 由后端生成和管理，前端不再需要生成
        // id: Date.now().toString(), 
        name: document.getElementById('name').value,
        type: document.getElementById('type').value,
        certifier: document.getElementById('certifier').value,
        handler: document.getElementById('handler').value,
        period: document.getElementById('period').value ? parseInt(document.getElementById('period').value, 10) : null,
        start_date: document.getElementById('startDate').value || null,
        end_date: document.getElementById('endDate').value,
        advance_days: parseInt(document.getElementById('advanceDays').value, 10) || 0,
        actual_reminder_date: document.getElementById('actualReminderDate').value || null,
        auto_renew: document.getElementById('autoRenew').checked || false,
        renew_period: document.getElementById('renewPeriod').value ? parseInt(document.getElementById('renewPeriod').value, 10) : null
    };
    
    // --- 调试日志 ---
    console.log("Collecting form data:", formData);
    // --- 调试日志结束 ---
    
    return formData;
}

function calculateActualReminderDate() {
    const endDateStr = document.getElementById('endDate').value;
    const advanceDays = parseInt(document.getElementById('advanceDays').value, 10) || 0;
    const actualReminderDateInput = document.getElementById('actualReminderDate');

    if (endDateStr) {
        const endDate = new Date(endDateStr);
        const reminderDate = new Date(endDate);
        reminderDate.setDate(reminderDate.getDate() - advanceDays);
        
        const year = reminderDate.getFullYear();
        const month = String(reminderDate.getMonth() + 1).padStart(2, '0');
        const day = String(reminderDate.getDate()).padStart(2, '0');
        
        actualReminderDateInput.value = `${year}-${month}-${day}`;
    } else {
        actualReminderDateInput.value = '';
    }
}

// --- API 调用 (使用 Fetch API) ---

// 辅助函数：创建带有认证 header 的 fetch 选项
function getFetchOptions(options = {}) {
    // 检查用户是否已登录
    const isLoggedIn = checkLoginStatus();
    
    // 如果用户已登录，添加认证 header
    if (isLoggedIn) {
        options.headers = {
            ...options.headers,
            'X-User-Logged-In': 'true'
        };
    }
    
    return options;
}

// 从后端获取所有提醒项
async function fetchReminders() {
    showLoadingSpinner(); // <-- 新增：开始加载时显示
    try {
        const response = await fetch(`${API_BASE_URL}/reminders`, getFetchOptions());
        if (!response.ok) {
            // 检查是否是认证错误
            if (response.status === 401) {
                // 会话过期，跳转到登录页
                handleSessionExpired();
                return [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reminders = await response.json();
        return reminders;
    } catch (error) {
        console.error('获取提醒项失败:', error);
        alert('获取数据失败，请检查服务器连接。');
        return []; // 返回空数组
    } finally {
        hideLoadingSpinner(); // <-- 新增：无论成功失败都隐藏
    }
}

// 向后端添加新提醒项
async function addReminder(reminder) {
    showLoadingSpinner(); // <-- 新增
    try {
        const response = await fetch(`${API_BASE_URL}/reminders`, getFetchOptions({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reminder),
        }));

        // 检查响应是否成功
        if (!response.ok) {
            // 检查是否是认证错误
            if (response.status === 401) {
                // 会话过期，跳转到登录页
                handleSessionExpired();
                return;
            }
            
            // 尝试解析错误信息
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // 如果解析 JSON 失败，则使用默认消息
            }
            throw new Error(errorMessage);
        }

        const newReminder = await response.json();
        console.log('添加成功:', newReminder);
        form.reset();
        hideForm();
        loadReminders(); // 重新加载列表以显示新项
    } catch (error) {
        console.error('添加提醒项失败:', error);
        alert(`添加失败: ${error.message}`); // 显示具体错误信息
    } finally {
        hideLoadingSpinner(); // <-- 新增
    }
}

// 向后端更新现有提醒项
async function updateReminder(id, updatedReminder) {
    showLoadingSpinner(); // <-- 新增
    try {
        // --- 调试日志 ---
        console.log("Sending update request for ID:", id, "Data:", updatedReminder);
        // --- 调试日志结束 ---
        
        const response = await fetch(`${API_BASE_URL}/reminders/${id}`, getFetchOptions({
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedReminder),
        }));

        // 检查响应是否成功
        if (!response.ok) {
            // 检查是否是认证错误
            if (response.status === 401) {
                // 会话过期，跳转到登录页
                handleSessionExpired();
                return;
            }
            
            // 尝试解析错误信息
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // 如果解析 JSON 失败，则使用默认消息
            }
            throw new Error(errorMessage);
        }

        const updatedItem = await response.json();
        console.log('更新成功:', updatedItem);
        form.reset();
        hideForm();
        toggleEditUI(false);
        loadReminders(); // 重新加载列表以显示更新
    } catch (error) {
        console.error('更新提醒项失败:', error);
        alert(`更新失败: ${error.message}`); // 显示具体错误信息
    } finally {
        hideLoadingSpinner(); // <-- 新增
    }
}

// 从后端删除提醒项
async function deleteReminder(id) {
    if (!confirm('确定要删除这个提醒项吗？')) {
        return; // 如果用户取消，直接返回
    }
    showLoadingSpinner(); // <-- 新增：确认后才显示加载
    try {
        const response = await fetch(`${API_BASE_URL}/reminders/${id}`, getFetchOptions({
            method: 'DELETE',
        }));

        // 检查响应是否成功
        if (!response.ok) {
            // 检查是否是认证错误
            if (response.status === 401) {
                // 会话过期，跳转到登录页
                handleSessionExpired();
                return;
            }
            
            // 尝试解析错误信息
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // 如果解析 JSON 失败，则使用默认消息
            }
            throw new Error(errorMessage);
        }

        console.log('删除成功');
        // 如果正在编辑被删除的项，则取消编辑
        if (isEditing && currentEditId === id) {
            cancelEdit();
            hideForm();
        }
        loadReminders(); // 重新加载列表
    } catch (error) {
        console.error('删除提醒项失败:', error);
        alert(`删除失败: ${error.message}`); // 显示具体错误信息
    } finally {
        hideLoadingSpinner(); // <-- 新增
    }
}

// --- 编辑和取消编辑 ---
function editReminder(id) {
    // 注意：为了简单起见，我们在这里再次从后端获取单个项的数据
    // 更高效的做法是在 loadReminders 时将数据缓存起来
    fetchReminders().then(reminders => {
        const reminder = reminders.find(item => item.id === id);
        if (reminder) {
            document.getElementById('edit-id').value = reminder.id; // 虽然没直接用，但保留以示完整
            document.getElementById('name').value = reminder.name;
            document.getElementById('type').value = reminder.type;
            document.getElementById('certifier').value = reminder.certifier || '';
            document.getElementById('handler').value = reminder.handler || '';
            document.getElementById('period').value = reminder.period || '';
            document.getElementById('startDate').value = reminder.start_date || ''; // 注意字段名映射
            document.getElementById('endDate').value = reminder.end_date;
            document.getElementById('advanceDays').value = reminder.advance_days || 0;
            document.getElementById('actualReminderDate').value = reminder.actual_reminder_date || '';
            
            // 自动续期相关字段
            const autoRenewCheckbox = document.getElementById('autoRenew');
            const renewPeriodGroup = document.getElementById('renewPeriodGroup');
            const renewPeriodInput = document.getElementById('renewPeriod');
            
            if (autoRenewCheckbox && renewPeriodGroup && renewPeriodInput) {
                autoRenewCheckbox.checked = reminder.auto_renew === 1 || reminder.auto_renew === true;
                renewPeriodGroup.style.display = autoRenewCheckbox.checked ? 'block' : 'none';
                renewPeriodInput.value = reminder.renew_period || 365;
            }

            toggleEditUI(true, id);
            showForm();
        }
    });
}

function cancelEdit() {
    form.reset();
    toggleEditUI(false);
    hideForm();
}

function toggleEditUI(editing, id = null) {
    isEditing = editing;
    currentEditId = id;

    if (editing) {
        formTitle.textContent = '编辑项';
        cancelEditBtn.style.display = 'inline-block';
    } else {
        formTitle.textContent = '添加新项';
        cancelEditBtn.style.display = 'none';
        currentEditId = null;
    }
}

// --- 数据加载和渲染 ---
function loadReminders() {
    fetchReminders().then(reminders => {
        renderReminders(reminders);
    });
}

// 检查并提醒即将到期的项目 (前端逻辑)
function checkAndAlertUpcomingReminders(reminders) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let upcomingReminders = [];
    reminders.forEach(reminder => {
        // 假设后端返回的日期是 'YYYY-MM-DD' 格式的字符串
        const actualReminderDate = new Date(reminder.actual_reminder_date);
        const endDate = new Date(reminder.end_date);
        
        if (actualReminderDate <= today && endDate >= today) {
            upcomingReminders.push(reminder.name);
        }
    });

    if (upcomingReminders.length > 0) {
        let message = '以下项目即将到期:\n';
        upcomingReminders.forEach(name => {
            message += `- ${name}\n`;
        });
        alert(message);
    }
}

// 渲染提醒项列表和状态统计
function renderReminders(reminders) {
    // 更新状态统计
    updateStats(reminders);

    // 清空现有列表
    remindersList.innerHTML = '';

    if (reminders.length === 0) {
        noDataMessage.style.display = 'block';
        // 页面加载时检查提醒
        if (!isEditing) { 
             checkAndAlertUpcomingReminders(reminders); 
        }
        return;
    }

    noDataMessage.style.display = 'none';
    
    // 按实际提醒日期排序（临近的在前）
    // 注意：排序应在后端做更合适，这里为了简化仍在前端做
    reminders.sort((a, b) => {
        return new Date(a.actual_reminder_date) - new Date(b.actual_reminder_date);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 遍历并添加到表格
    reminders.forEach(reminder => {
        const row = document.createElement('tr');

        let status = '正常';
        let statusClass = 'status-normal';
        let statusIcon = '<i class="fas fa-check-circle"></i>'; // 默认正常图标
        let rowClass = '';
        const actualReminderDate = new Date(reminder.actual_reminder_date);
        const endDate = new Date(reminder.end_date);

        if (endDate < today) {
            status = '已过期';
            statusClass = 'status-expired';
            statusIcon = '<i class="fas fa-exclamation-circle"></i>'; // 过期图标
            rowClass = 'row-expired';
        } else if (actualReminderDate <= today) {
            status = '即将到期';
            statusClass = 'status-warning';
            statusIcon = '<i class="fas fa-clock"></i>'; // 即将到期图标
            rowClass = 'row-warning';
        }

        row.className = rowClass;

        // 格式化日期显示 (字段名从 snake_case 映射为 camelCase)
        const startDateStr = reminder.start_date ? reminder.start_date : '-';
        const periodStr = reminder.period ? reminder.period : '-';

        row.innerHTML = `
            <td>${reminder.name}</td>
            <td>${reminder.type}</td>
            <td>${reminder.certifier || '-'}</td>
            <td>${reminder.handler || '-'}</td>
            <td>${periodStr}</td>
            <td>${startDateStr}</td>
            <td>${reminder.end_date}</td>
            <td>${reminder.advance_days}</td>
            <td>${reminder.actual_reminder_date}</td>
            <td class="${statusClass}">${statusIcon} ${status}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${reminder.id}"><i class="fas fa-edit"></i> 编辑</button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${reminder.id}"><i class="fas fa-trash"></i> 删除</button>
            </td>
        `;

        remindersList.appendChild(row);
    });

    // 页面加载时检查提醒
    if (!isEditing) { 
        checkAndAlertUpcomingReminders(reminders); 
    }

    // 为新添加的按钮绑定事件
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'), 10); // ID 是数字
            editReminder(id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'), 10); // ID 是数字
            deleteReminder(id);
        });
    });
}

/**
 * 检查并处理自动续期（仅在用户手动触发时执行）
 */
async function handleAutoRenew() {
    try {
        // 从后端获取所有提醒项
        const reminders = await fetchReminders();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 找出需要续期的项目
        const remindersToRenew = reminders.filter(reminder => {
            // 检查是否启用了自动续期并且项目已过期
            if (reminder.auto_renew && (reminder.auto_renew === 1 || reminder.auto_renew === true)) {
                const endDate = new Date(reminder.end_date);
                return endDate < today;
            }
            return false;
        });
        
        // 如果没有需要续期的项目，直接返回
        if (remindersToRenew.length === 0) {
            console.log('没有需要自动续期的项目');
            return;
        }
        
        console.log(`找到 ${remindersToRenew.length} 个需要续期的项目`);
        
        // 逐个处理续期
        for (const reminder of remindersToRenew) {
            await createRenewedReminder(reminder);
        }
        
        // 续期完成后重新加载列表
        loadReminders();
        alert(`自动续期完成，共处理了 ${remindersToRenew.length} 个项目`);
    } catch (error) {
        console.error('处理自动续期时出错:', error);
        alert('处理自动续期时出错: ' + error.message);
    }
}

/**
 * 创建续期后的提醒项
 * @param {Object} originalReminder - 原始提醒项
 */
async function createRenewedReminder(originalReminder) {
    // 检查是否已经存在相同名称且日期相近的续期项目，避免重复创建
    const reminders = await fetchReminders();
    const existingRenewed = reminders.find(r => 
        r.name === originalReminder.name && 
        r.auto_renew === originalReminder.auto_renew &&
        // 检查是否在原项目结束日期之后的一年内已经存在续期项目
        new Date(r.start_date) > new Date(originalReminder.end_date) &&
        new Date(r.start_date) < new Date(new Date(originalReminder.end_date).setFullYear(new Date(originalReminder.end_date).getFullYear() + 1))
    );
    
    if (existingRenewed) {
        console.log(`项目 "${originalReminder.name}" 已经存在续期项目，跳过创建`);
        return;
    }
    
    // 计算新的开始日期和结束日期
    const originalEndDate = new Date(originalReminder.end_date);
    const newStartDate = new Date(originalEndDate);
    newStartDate.setDate(newStartDate.getDate() + 1); // 新开始日期是原结束日期的第二天
    
    // 计算新的结束日期
    const renewPeriod = originalReminder.renew_period || 365; // 默认续期周期为365天
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + renewPeriod - 1);
    
    // 准备新提醒项的数据
    const newReminder = {
        name: originalReminder.name,
        type: originalReminder.type,
        certifier: originalReminder.certifier,
        handler: originalReminder.handler,
        period: originalReminder.period,
        start_date: newStartDate.toISOString().split('T')[0], // 转换为 YYYY-MM-DD 格式
        end_date: newEndDate.toISOString().split('T')[0], // 转换为 YYYY-MM-DD 格式
        advance_days: originalReminder.advance_days,
        actual_reminder_date: null, // 将由后端重新计算
        auto_renew: originalReminder.auto_renew,
        renew_period: originalReminder.renew_period
    };
    
    // 计算实际提醒日期
    if (newReminder.end_date && newReminder.advance_days !== undefined) {
        const endDate = new Date(newReminder.end_date);
        const reminderDate = new Date(endDate);
        reminderDate.setDate(reminderDate.getDate() - newReminder.advance_days);
        newReminder.actual_reminder_date = reminderDate.toISOString().split('T')[0];
    }
    
    // 发送请求创建新的提醒项
    try {
        const response = await fetch(`${API_BASE_URL}/reminders`, getFetchOptions({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newReminder),
        }));

        if (!response.ok) {
            // 检查是否是认证错误
            if (response.status === 401) {
                // 会话过期，跳转到登录页
                handleSessionExpired();
                return;
            }
            
            // 尝试解析错误信息
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // 如果解析 JSON 失败，则使用默认消息
            }
            throw new Error(errorMessage);
        }

        const createdReminder = await response.json();
        console.log('自动续期成功:', createdReminder);
        return createdReminder;
    } catch (error) {
        console.error('自动续期失败:', error);
        throw error; // 重新抛出错误，让调用者处理
    }
}

// 更新状态统计显示
function updateStats(reminders) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalCount = reminders.length;
    let warningCount = 0;
    let expiredCount = 0;

    reminders.forEach(reminder => {
        const actualReminderDate = new Date(reminder.actual_reminder_date);
        const endDate = new Date(reminder.end_date);

        if (endDate < today) {
            expiredCount++;
        } else if (actualReminderDate <= today) {
            warningCount++;
        }
    });

    totalCountElement.textContent = totalCount;
    warningCountElement.textContent = warningCount;
    expiredCountElement.textContent = expiredCount;
}

// --- 新增：导出提醒项到 CSV ---
/**
 * 触发浏览器下载 CSV 文件
 */
function exportRemindersToCSV() {
    // 构建导出 API 的 URL
    const exportUrl = `${API_BASE_URL}/reminders/export`;
    
    // 创建一个临时的 <a> 元素
    const link = document.createElement('a');
    link.href = exportUrl;
    // 设置 download 属性，建议文件名 (浏览器支持情况不一，但后端 Header 优先级更高)
    link.download = 'reminders_export.csv'; 
    link.style.display = 'none'; // 隐藏链接
    
    // 将链接添加到页面中
    document.body.appendChild(link);
    
    // 触发点击事件，浏览器会开始下载
    link.click();
    
    // 清理：从页面中移除临时链接
    document.body.removeChild(link);
}
// --- 新增结束 ---

// --- 新增：从 CSV 导入提醒项 ---
/**
 * 从文件输入框读取 CSV 文件并发送到后端导入
 * @param {HTMLInputElement} fileInput - 文件输入元素
 */
async function importRemindersFromCSV(fileInput) {
    const file = fileInput.files[0];
    if (!file) {
        alert('请先选择一个 CSV 文件。');
        return;
    }

    // 1. 创建 FormData 对象来包装文件
    const formData = new FormData();
    formData.append('file', file);

    // 2. 显示一个简单的加载提示（可选）
    // 这里可以添加更复杂的加载动画
    const originalBtnText = importCsvBtn.textContent;
    importCsvBtn.textContent = '导入中...';
    importCsvBtn.disabled = true;

    try {
        // 3. 发送 POST 请求到后端 API
        const response = await fetch(`${API_BASE_URL}/reminders/import`, getFetchOptions({
            method: 'POST',
            // 注意：不要设置 Content-Type header，让浏览器自动设置 multipart/form-data
            body: formData
        }));

        // 4. 处理响应
        const data = await response.json();
        
        if (response.ok) {
            // 导入成功
            alert(data.message); // 显示后端返回的成功信息
            // 清空文件输入框
            fileInput.value = '';
            // 重新加载列表以显示新导入的数据
            loadReminders();
        } else {
            // 检查是否是认证错误
            if (response.status === 401) {
                // 会话过期，跳转到登录页
                handleSessionExpired();
                return;
            }
            
            // 导入失败
            console.error('导入失败:', data.error);
            alert(`导入失败: ${data.error}`);
        }
    } catch (error) {
        // 网络错误或其他异常
        console.error('导入请求失败:', error);
        alert(`导入请求失败: ${error.message}`);
    } finally {
        // 5. 恢复按钮状态
        importCsvBtn.textContent = originalBtnText;
        importCsvBtn.disabled = false;
    }
}
// --- 新增结束 ---

// --- 新增：登录和密码管理函数 ---

/**
 * 初始化密码
 * 密码现在存储在服务器上，此函数留空
 */
function initializePassword() {
    // 无需操作
}

/**
 * 检查用户是否已登录
 * @returns {boolean}
 */
function checkLoginStatus() {
    return sessionStorage.getItem(SESSION_KEY_LOGGED_IN) === 'true';
}

/**
 * 显示登录界面，隐藏主应用
 */
function showLogin() {
    loginSection.style.display = 'block';
    appSection.style.display = 'none';
    // 清空可能存在的错误信息
    if (loginError) {
        loginError.style.display = 'none';
        loginError.textContent = '';
    }
}

/**
 * 显示主应用，隐藏登录界面
 */
function showApp() {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
}

/**
 * 设置登录表单的事件监听器
 */
function setupLoginListener() {
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    // 登录界面也可能需要设置一些基本的按钮监听（如果有的话）
    // 例如，如果登录界面有"忘记密码"链接等
}

/**
 * 处理登录表单提交
 * @param {Event} e
 */
async function handleLogin(e) {  // <-- 改为 async
    e.preventDefault();
    
    const enteredPassword = passwordInput.value.trim();
    
    if (!enteredPassword) {
        if (loginError) {
            loginError.textContent = '请输入密码。';
            loginError.style.display = 'block';
        }
        return;
    }

    // 显示加载指示器
    showLoadingSpinner();
    
    try {
        // 调用后端 API 进行登录验证
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: enteredPassword }),
        });

        if (response.ok) {
                // 登录成功
                sessionStorage.setItem(SESSION_KEY_LOGGED_IN, 'true');
                showApp();
                loadReminders(); // 登录后加载数据
                setupEventListeners(); // 登录后设置所有事件监听器
                setupEmailEventListeners(); // <-- 新增
                fetchEmailConfig(); // <-- 新增：登录后获取邮箱配置
                passwordInput.value = ''; // 清空密码输入框
                if (loginError) {
                    loginError.style.display = 'none';
                }
            } else {
            // 登录失败
            const data = await response.json();
            if (loginError) {
                loginError.textContent = data.error || '登录失败';
                loginError.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('登录请求失败:', error);
        if (loginError) {
            loginError.textContent = '网络错误，请稍后重试。';
            loginError.style.display = 'block';
        }
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * 处理注销
 */
function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY_LOGGED_IN);
    showLogin();
    // 可选：重置表单等
    if (form) form.reset();
    hideForm();
    toggleEditUI(false);
}

/**
 * 处理会话过期
 */
function handleSessionExpired() {
    alert('登录会话已过期，请重新登录。');
    // 清除登录状态
    sessionStorage.removeItem(SESSION_KEY_LOGGED_IN);
    // 显示登录界面
    showLogin();
}

async function handleChangePassword(e) {  // <-- 改为 async 并接收事件参数 e
    e.preventDefault(); // <-- 阻止表单默认提交行为
    
    // 从表单获取密码输入
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    
    const oldPassword = currentPasswordInput.value.trim();
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmNewPasswordInput.value.trim();
    
    if (!oldPassword) {
        alert('请输入当前密码！');
        currentPasswordInput.focus();
        return;
    }
    if (!newPassword || newPassword === '') {
        alert('新密码不能为空！');
        newPasswordInput.focus();
        return;
    }
    if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致！');
        confirmNewPasswordInput.focus();
        return;
    }

    // 显示加载指示器
    showLoadingSpinner();
    
    try {
        // 调用后端 API 修改密码
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, getFetchOptions({ // <-- 使用 getFetchOptions
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                oldPassword: oldPassword,
                newPassword: newPassword.trim()
            }),
        }));

        const data = await response.json();
        
        if (response.ok) {
            alert('密码修改成功！');
            // 清空表单
            changePasswordForm.reset();
            // 隐藏表单
            hideChangePasswordForm();
        } else {
            alert(`密码修改失败: ${data.error}`);
        }
    } catch (error) {
        console.error('修改密码请求失败:', error);
        alert('网络错误，密码修改失败。');
    } finally {
        hideLoadingSpinner();
    }
}

// --- 新增结束 ---// --- 新增：邮箱配置和邮件发送相关 JS ---

// 事件监听器
function setupEmailEventListeners() {
     // 注意：事件监听器在 setupEventListeners 中已经添加
     // 这里可以放其他与邮箱相关的初始化逻辑（如果有的话）
}

// 获取邮箱配置
async function fetchEmailConfig() {
    showLoadingSpinner();
    try {
        const response = await fetch(`${API_BASE_URL}/settings/email`, getFetchOptions());
        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpired();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();

        // 填充表单
        if (document.getElementById('smtpServer')) document.getElementById('smtpServer').value = config.smtp_server || '';
        if (document.getElementById('smtpPort')) document.getElementById('smtpPort').value = config.smtp_port || '';
        if (document.getElementById('senderEmail')) document.getElementById('senderEmail').value = config.sender_email || '';
        if (document.getElementById('recipientEmail')) document.getElementById('recipientEmail').value = config.recipient_email || '';

        // 密码字段不返回，保持为空

    } catch (error) {
        console.error('获取邮箱配置失败:', error);
        alert('获取邮箱配置失败: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}


// 获取钉钉配置
async function fetchDingtalkConfig() {
    showLoadingSpinner();
    try {
        const response = await fetch(`${API_BASE_URL}/settings/dingtalk`, getFetchOptions());
        console.log('获取钉钉配置的响应:', response); // 添加调试信息
        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpired();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();
        console.log('从服务器获取的钉钉配置:', config); // 添加调试信息

        // 填充表单
        if (document.getElementById('dingtalkWebhook')) {
            document.getElementById('dingtalkWebhook').value = config.dingtalk_webhook || '';
            console.log('设置钉钉Webhook输入框的值:', config.dingtalk_webhook || ''); // 添加调试信息
        }

        // 密钥字段不返回，保持为空
        console.log('钉钉配置获取完成'); // 添加调试信息

    } catch (error) {
        console.error('获取钉钉配置失败:', error);
        alert('获取钉钉配置失败: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

// 保存邮箱配置
async function handleSaveEmailConfig(e) {
    e.preventDefault();
    showLoadingSpinner();
    try {
        // 直接从表单元素获取值，而不是使用FormData
        const configData = {
            smtp_server: document.getElementById('smtpServer').value,
            smtp_port: document.getElementById('smtpPort').value,
            sender_email: document.getElementById('senderEmail').value,
            recipient_email: document.getElementById('recipientEmail').value
        };
        
        // 只有当密码字段有输入时才发送密码
        const passwordValue = document.getElementById('senderPassword').value;
        if (passwordValue && passwordValue.trim() !== '') {
            configData.sender_password = passwordValue;
        }

        // 调试信息：检查获取的配置数据
        console.log('获取的配置数据:', configData);
        
        // 不再移除空字符串的字段，因为后端需要至少一个字段
        // 确保至少发送一个字段
        
        // 调试信息：检查最终发送的配置数据
        console.log('最终发送的配置数据:', configData);

        const response = await fetch(`${API_BASE_URL}/settings/email`, getFetchOptions({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData)
        }));

        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpired();
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        alert(data.message || '邮箱配置保存成功');
        console.log('邮箱配置保存响应:', data);

    } catch (error) {
        console.error('保存邮箱配置失败:', error);
        alert('保存邮箱配置失败: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}


// 保存钉钉配置
async function handleSaveDingtalkConfig(e) {
    e.preventDefault();
    showLoadingSpinner();
    try {
        // 直接从表单元素获取值
        const configData = {
            dingtalk_webhook: document.getElementById('dingtalkWebhook').value
        };
        
        // 只有当密钥字段有输入时才发送密钥
        const secretValue = document.getElementById('dingtalkSecret').value;
        if (secretValue && secretValue.trim() !== '') {
            configData.dingtalk_secret = secretValue;
        }

        // 调试信息：检查获取的配置数据
        console.log('获取的钉钉配置数据:', configData);
        
        // 不再移除空字符串的字段，因为后端需要至少一个字段
        // 确保至少发送一个字段（webhook URL）
        // 如果两个字段都为空，仍然发送 webhook 字段（空字符串）
        
        // 调试信息：检查最终发送的配置数据
        console.log('最终发送的钉钉配置数据:', configData);

        const fetchOptions = getFetchOptions({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData)
        });
        
        console.log('发送的请求选项:', fetchOptions);

        const response = await fetch(`${API_BASE_URL}/settings/dingtalk`, fetchOptions);

        console.log('收到的响应:', response);
        
        // 检查响应状态
        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpired();
                return;
            }
            
            // 尝试解析错误响应
            let errorData;
            try {
                errorData = await response.json();
            } catch (parseError) {
                // 如果JSON解析失败，使用文本内容
                const errorText = await response.text();
                errorData = { error: `HTTP ${response.status}: ${errorText || response.statusText}` };
            }
            
            console.error('服务器返回错误:', errorData);
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        alert(data.message || '钉钉配置保存成功');
        console.log('钉钉配置保存响应:', data);

    } catch (error) {
        console.error('保存钉钉配置失败:', error);
        alert('保存钉钉配置失败: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

// 发送测试邮件
async function handleSendTestEmail() {
     // 为了简单，我们直接调用后端检查并发送的 API，
     // 但可以创建一个专门的测试邮件 API
     console.log('点击发送测试邮件按钮');
     alert('将发送一封包含当前配置信息的测试邮件。请检查收件箱。');
     
     // 添加延迟以便用户能看到alert
     setTimeout(() => {
         handleCheckAndSendEmail(true); // 传递一个标志位表示是测试
     }, 1000);
}


// 发送测试钉钉消息
async function handleSendTestDingtalk() {
     // 为了简单，我们直接调用后端检查并发送的 API，
     // 但可以创建一个专门的测试钉钉消息 API
     console.log('点击发送测试钉钉消息按钮');
     alert('将发送一条包含当前配置信息的测试消息到钉钉。请检查群聊。');
     
     // 添加延迟以便用户能看到alert
     setTimeout(() => {
         handleCheckAndSendDingtalk(true); // 传递一个标志位表示是测试
     }, 1000);
}

// 检查并发送提醒邮件
async function handleCheckAndSendEmail(isTest = false) {
    console.log('开始处理邮件发送，isTest:', isTest);
    showLoadingSpinner();
    try {
        // 可以在这里添加一个确认对话框
        // if (!isTest && !confirm('确定要检查并发送即将到期的提醒邮件吗？')) return;

        const endpoint = `${API_BASE_URL}/reminders/check-and-email`;
        console.log('发送请求到:', endpoint);
        
        const fetchOptions = getFetchOptions({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
            // 如果需要区分测试，可以发送一个 body: { isTest: true }
        });
        console.log('请求选项:', fetchOptions);
        
        console.log('开始发送fetch请求');
        const response = await fetch(endpoint, fetchOptions);
        console.log('收到响应:', response);
        
        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpired();
                return;
            }
            const errorData = await response.json().catch(() => ({})); // 防止解析错误
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        alert(data.message || '邮件发送操作完成');
        console.log('邮件发送响应数据:', data);
        
    } catch (error) {
        console.error('检查并发送邮件失败:', error);
        alert('检查并发送邮件失败: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}


// 检查并发送钉钉提醒消息
async function handleCheckAndSendDingtalk(isTest = false) {
    console.log('开始处理钉钉消息发送，isTest:', isTest);
    showLoadingSpinner();
    try {
        // 可以在这里添加一个确认对话框
        // if (!isTest && !confirm('确定要检查并发送即将到期的提醒消息到钉钉吗？')) return;

        const endpoint = `${API_BASE_URL}/reminders/check-and-dingtalk`;
        console.log('发送请求到:', endpoint);
        
        const fetchOptions = getFetchOptions({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
            // 如果需要区分测试，可以发送一个 body: { isTest: true }
        });
        console.log('请求选项:', fetchOptions);
        
        console.log('开始发送fetch请求');
        const response = await fetch(endpoint, fetchOptions);
        console.log('收到响应:', response);
        
        if (!response.ok) {
            if (response.status === 401) {
                handleSessionExpired();
                return;
            }
            const errorData = await response.json().catch(() => ({})); // 防止解析错误
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        alert(data.message || '钉钉消息发送操作完成');
        console.log('钉钉消息发送响应数据:', data);
        
    } catch (error) {
        console.error('检查并发送钉钉消息失败:', error);
        alert('检查并发送钉钉消息失败: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

// --- 新增结束 ---

// --- 新增：自动刷新功能 ---
/**
 * 设置每天早上8点自动刷新页面
 */
function setupAutoRefresh() {
    // 计算到明天早上8点的时间间隔
    function getTimeUntil8AM() {
        const now = new Date();
        const next8AM = new Date();
        next8AM.setHours(8, 0, 0, 0); // 设置为今天的8:00:00.000
        
        // 如果当前时间已经过了今天的8点，则设置为明天的8点
        if (now > next8AM) {
            next8AM.setDate(next8AM.getDate() + 1);
        }
        
        // 返回到下一个8点的毫秒数
        return next8AM - now;
    }
    
    // 刷新页面的函数
    function refreshPage() {
        console.log('执行每日自动刷新');
        location.reload();
    }
    
    // 设置第一次定时器
    const timeUntil8AM = getTimeUntil8AM();
    console.log(`下次自动刷新将在 ${timeUntil8AM / 1000 / 60 / 60} 小时后执行`);
    
    // 设置定时器到明天早上8点
    setTimeout(() => {
        // 执行刷新
        refreshPage();
        
        // 设置后续每天的定时器（每24小时）
        setInterval(refreshPage, 24 * 60 * 60 * 1000);
    }, timeUntil8AM);
}

// 页面可见性变化时的处理函数
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // 页面变为可见时检查是否需要刷新
        console.log('页面变为可见，检查是否需要自动刷新');
    }
});
// --- 新增结束 ---