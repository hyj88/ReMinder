import sqlite3
import json

# 数据库文件路径
DATABASE = 'reminders.db'

# 请在此处填写您的实际邮箱配置
actual_config = {
    'smtp_server': 'smtp.gmail.com',  # 例如: smtp.gmail.com, smtp.qq.com
    'smtp_port': '587',               # 例如: 587 (TLS), 465 (SSL)
    'sender_email': 'your_email@gmail.com',     # 您的邮箱地址
    'sender_password': 'your_app_password',     # 您的邮箱密码或应用专用密码
    'recipient_email': 'recipient@example.com'  # 接收提醒邮件的邮箱地址
}

print("更新邮箱配置...")
print(f"配置数据: {actual_config}")

# 更新数据库中的邮箱配置
try:
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        # 更新提供的字段
        for key, value in actual_config.items():
            # 特殊处理密码：只有当提供了新密码时才更新（即使是空字符串也更新）
            if key == 'sender_password':
                cursor.execute(
                    "UPDATE settings SET value = ? WHERE key = ?",
                    (value, key)
                )
                print(f"更新密码字段: {key} = {'*' * len(value) if value else '空'}")
            else:
                # 对于其他字段，只有当值不是None且不是空字符串时才更新
                if value is not None and value != "":
                    cursor.execute(
                        "UPDATE settings SET value = ? WHERE key = ?",
                        (value, key)
                    )
                    print(f"更新字段: {key} = {value}")
                else:
                    print(f"跳过更新字段: {key} (值为None或空字符串)")
        conn.commit()
    print("邮箱配置更新完成")
except Exception as e:
    print(f"更新邮箱配置失败: {e}")

# 检查更新后的配置
print("\n更新后的邮箱配置:")
try:
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        for key in ['smtp_server', 'smtp_port', 'sender_email', 'sender_password', 'recipient_email']:
            cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            if row:
                if key == 'sender_password':
                    print(f"{key}: {'*' * len(row[0]) if row[0] else '空'}")
                else:
                    print(f"{key}: {row[0] if row[0] else '空'}")
            else:
                print(f"{key}: 未找到")
except Exception as e:
    print(f"获取邮箱配置失败: {e}")