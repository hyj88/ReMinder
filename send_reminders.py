import sys
import os

# --- 配置 ---
# 确保这个脚本能够找到你的 app.py 所在的目录
# PROJECT_DIR 应该设置为包含 app.py 和 email_utils.py 的目录
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__)) # 假设脚本和 app.py 在同一目录

if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

# --- 导入并调用 ---
try:
    # 从 email_utils 导入检查和发送邮件的函数
    from email_utils import check_upcoming_reminders_for_email
    print("开始执行定时邮件检查任务...")
    check_upcoming_reminders_for_email()
    print("定时邮件检查任务执行完毕。")
except Exception as e:
    print(f"定时任务执行失败: {e}")
    import traceback
    traceback.print_exc()
    # 可以在这里添加发送错误通知邮件的逻辑