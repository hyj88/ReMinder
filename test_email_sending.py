import sys
import os

# 添加项目目录到 Python 路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from email_utils import check_upcoming_reminders_for_email

print("检查即将到期的项目并发送邮件...")
result = check_upcoming_reminders_for_email()
print(f"检查结果: {result}")
print(f"发现 {len(result)} 个即将到期的项目")