// --- 事件监听器 ---
function setupEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', cancelEdit);
    showFormBtn.addEventListener('click', () => {
        showForm();
        if (isEditing) {
            cancelEdit();
        }
    });

    // --- 新增：密码管理和邮箱配置事件监听 ---
    if (showChangePasswordBtn) {
        showChangePasswordBtn.addEventListener('click', showChangePasswordForm);
    }
    if (cancelChangePasswordBtn) {
        cancelChangePasswordBtn.addEventListener('click', hideChangePasswordForm);
    }
    if (showEmailConfigBtn) {
        showEmailConfigBtn.addEventListener('click', showEmailConfigForm);
    }
    if (cancelEmailConfigBtn) {
        cancelEmailConfigBtn.addEventListener('click', hideEmailConfigForm);
    }
    // --- 新增结束 ---

    // --- 为导出 CSV 按钮添加事件监听 ---
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportRemindersToCSV);
    }
    // --- 新增：为导入 CSV 按钮添加事件监听 ---
    if (importCsvBtn && importCsvFileInput) {
        importCsvBtn.addEventListener('click', () => importRemindersFromCSV(importCsvFileInput));
    }
    // --- 新增：登录相关按钮事件监听 ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    // --- 新增结束 ---
    
    // --- 新增：邮箱配置和密码管理相关表单事件监听 ---
    // 注意：按钮点击已通过 data-bs-toggle 处理，只需监听表单提交
    if (emailConfigForm) {
        emailConfigForm.addEventListener('submit', handleSaveEmailConfig);
    }
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }
    // --- 新增：为发送测试邮件按钮添加事件监听 ---
    if (sendTestEmailBtn) {
        sendTestEmailBtn.addEventListener('click', handleSendTestEmail);
    }
    // --- 新增结束 ---

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
}