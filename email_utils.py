import smtplib
import sqlite3
import logging
import traceback
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime

# 假设 DATABASE 和其他配置在主 app.py 中定义
# 为了模块化，我们可以在这里重新定义或从环境变量/配置文件读取
# 但为简单起见，我们假设 DATABASE 路径是已知的
DATABASE = 'reminders.db'

def get_email_config():
    """从数据库获取邮件配置"""
    config = {}
    try:
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            for key in ['smtp_server', 'smtp_port', 'sender_email', 'sender_password', 'recipient_email']:
                cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
                row = cursor.fetchone()
                config[key] = row[0] if row else ''
    except Exception as e:
        logging.error(f"获取邮件配置时出错: {e}")
        print(f"获取邮件配置时出错: {e}")
    return config

def send_reminder_email(upcoming_reminders, config=None):
    """
    发送即将到期提醒邮件
    :param upcoming_reminders: 即将到期的提醒项列表
    :param config: (可选) 邮件配置字典。如果不提供，将从数据库获取。
    """
    if config is None:
        config = get_email_config()
        
    try:
        # 1. 验证配置是否完整
        required_keys = ['smtp_server', 'smtp_port', 'sender_email', 'sender_password', 'recipient_email']
        if not all(config.get(key) for key in required_keys):
            msg = "警告: 邮件配置不完整，无法发送邮件。"
            print(msg)
            logging.warning(msg)
            return False # 表示未发送

        # 2. 准备邮件内容
        subject = "证照即将到期提醒"
        body = """您好，

以下证照即将到期，请及时处理：


"""
        for reminder in upcoming_reminders:
            body += f"- {reminder['name']} (类型: {reminder['type']}, 到期日期: {reminder['end_date']})\n"
        body += """

请登录系统查看详情。


谢谢！"""

        # 3. 创建 MIMEText 对象
        message = MIMEMultipart()
        message["From"] = config['sender_email']
        message["To"] = config['recipient_email']
        message["Subject"] = subject
        message.attach(MIMEText(body, "plain", 'utf-8')) # 指定编码

        # 4. 连接 SMTP 服务器并发送邮件
        # 将端口号转换为整数
        port = int(config['smtp_port'])
        # 创建安全的 SSL 上下文
        context = ssl.create_default_context()

        # 根据端口号选择连接方式
        if port == 465:
            # 使用 SMTP_SSL 连接（适用于端口 465）
            with smtplib.SMTP_SSL(config['smtp_server'], port, context=context) as server:
                server.login(config['sender_email'], config['sender_password'])
                text = message.as_string()
                server.sendmail(config['sender_email'], config['recipient_email'], text)
        else:
            # 使用普通 SMTP 连接并启动 TLS（适用于端口 587 等）
            with smtplib.SMTP(config['smtp_server'], port) as server:
                server.starttls(context=context) # 启用 TLS 加密
                server.login(config['sender_email'], config['sender_password'])
                text = message.as_string()
                server.sendmail(config['sender_email'], config['recipient_email'], text)

        msg = f"邮件已成功发送至 {config['recipient_email']}"
        print(msg)
        logging.info(msg)
        return True # 表示发送成功

    except Exception as e:
        msg = f"发送邮件时发生错误: {e}"
        print(msg)
        logging.error(msg)
        traceback.print_exc() # 打印堆栈跟踪，便于调试
        return False # 表示发送失败

def check_upcoming_reminders_for_email():
    """
    检查即将到期的项目 (供独立脚本或定时任务调用)
    """
    try:
        with sqlite3.connect(DATABASE) as conn:
            conn.row_factory = sqlite3.Row # 使行可以通过列名访问
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM reminders ORDER BY actual_reminder_date')
            rows = cursor.fetchall()

        reminders = [dict(row) for row in rows] # 转换为字典列表

        today = datetime.date.today()
        upcoming_reminders = []

        for reminder in reminders:
            # 将日期字符串转换为 date 对象进行比较
            try:
                actual_reminder_date = datetime.datetime.strptime(reminder['actual_reminder_date'], "%Y-%m-%d").date()
                end_date = datetime.datetime.strptime(reminder['end_date'], "%Y-%m-%d").date()

                # 检查实际提醒日期是否已到（<= 今天） 且 未过期 (结束日期 >= 今天)
                if actual_reminder_date <= today and end_date >= today:
                    upcoming_reminders.append(reminder)
            except (ValueError, TypeError) as e:
                msg = f"警告: 处理提醒项 ID {reminder.get('id', 'unknown')} 的日期时出错: {e}"
                print(msg)
                logging.warning(msg)

        if upcoming_reminders:
            print(f"发现 {len(upcoming_reminders)} 个即将到期的项目。")
            success = send_reminder_email(upcoming_reminders)
            if success:
                print("已发送提醒邮件。")
            else:
                print("提醒邮件发送失败。")
            return upcoming_reminders # 返回即将到期的列表
        else:
            print("当前没有即将到期的项目。")
            return []
    except Exception as e:
        msg = f"检查即将到期项目时发生错误: {e}"
        print(msg)
        logging.error(msg)
        traceback.print_exc()
        return []