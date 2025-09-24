# app.py

from flask import Flask, request, jsonify, send_from_directory, Response
import sqlite3
import os
import csv
import io
import json
import logging
import traceback
import ssl # 添加 ssl 模块用于安全连接
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime
from functools import wraps
import time
import hmac
import hashlib
import base64
import urllib.parse
import requests


app = Flask(__name__, static_folder='.')

# 数据库文件路径
DATABASE = 'reminders.db'

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def init_db():
    """初始化数据库表"""
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        
        # 检查 reminders 表是否存在 auto_renew 字段
        cursor.execute("PRAGMA table_info(reminders)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if 'auto_renew' not in column_names:
            # 如果没有 auto_renew 字段，需要重建表
            # 1. 重命名原表
            cursor.execute("ALTER TABLE reminders RENAME TO reminders_old")
            
            # 2. 创建新表
            cursor.execute('''
                CREATE TABLE reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    certifier TEXT,
                    handler TEXT,
                    period INTEGER,
                    start_date TEXT,
                    end_date TEXT NOT NULL,
                    advance_days INTEGER NOT NULL,
                    actual_reminder_date TEXT,
                    auto_renew BOOLEAN DEFAULT FALSE,
                    renew_period INTEGER
                )
            ''')
            
            # 3. 从旧表复制数据到新表
            cursor.execute('''
                INSERT INTO reminders (
                    id, name, type, certifier, handler, period, 
                    start_date, end_date, advance_days, actual_reminder_date
                ) SELECT 
                    id, name, type, certifier, handler, period, 
                    start_date, end_date, advance_days, actual_reminder_date
                FROM reminders_old
            ''')
            
            # 4. 删除旧表
            cursor.execute("DROP TABLE reminders_old")
        
        # --- 创建 settings 表 ---
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        ''')
        
        # --- 检查并初始化密码 ---
        cursor.execute("SELECT value FROM settings WHERE key = 'password'")
        row = cursor.fetchone()
        if not row:
            # 设置初始密码
            initial_password = 'unimedia'
            cursor.execute(
                "INSERT INTO settings (key, value) VALUES ('password', ?)",
                (initial_password,)
            )
        # --- 密码初始化结束 ---
        
        # --- 检查并初始化邮箱配置 ---
        email_config_keys = [
            'smtp_server', 'smtp_port', 'sender_email',
            'sender_password', 'recipient_email'
        ]
        for key in email_config_keys:
            cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            if not row:
                # 设置默认空值
                cursor.execute(
                    "INSERT INTO settings (key, value) VALUES (?, ?)",
                    (key, '')
                )
        
        # --- 检查并初始化钉钉配置 ---
        dingtalk_config_keys = [
            'dingtalk_webhook', 'dingtalk_secret'
        ]
        for key in dingtalk_config_keys:
            cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            if not row:
                # 设置默认空值
                cursor.execute(
                    "INSERT INTO settings (key, value) VALUES (?, ?)",
                    (key, '')
                )
        # --- 配置初始化结束 ---
        
        conn.commit()

# 确保应用启动时初始化数据库
init_db()

# --- 工具函数 ---

def send_reminder_email(upcoming_reminders):
    """
    发送即将到期提醒邮件
    :param upcoming_reminders: 即将到期的提醒项列表
    """
    try:
        # 1. 从数据库获取邮件配置
        config = {}
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            for key in ['smtp_server', 'smtp_port', 'sender_email', 'sender_password', 'recipient_email']:
                cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
                row = cursor.fetchone()
                config[key] = row[0] if row else ''

        # 2. 验证配置是否完整
        required_keys = ['smtp_server', 'smtp_port', 'sender_email', 'sender_password', 'recipient_email']
        # 注意：密码字段可能是空字符串（表示不修改），所以不强制要求
        # 但其他字段必须提供
        for key in required_keys:
            if key != 'sender_password' and (key not in config or not config[key]):
                 msg = f"警告: 邮件配置不完整，缺少字段: {key}"
                 print(msg)
                 logging.warning(msg)
                 return False # 表示未发送

        # 3. 准备邮件内容
        subject = "证照即将到期提醒"
        body = "您好，\n\n以下证照即将到期，请及时处理：\n\n"
        for reminder in upcoming_reminders:
            body += f"- {reminder['name']} (类型: {reminder['type']}, 到期日期: {reminder['end_date']})\n"
        body += "\n请登录系统查看详情。\n\n谢谢！"

        # 4. 创建 MIMEText 对象并处理多个收件人
        recipient_string = config.get('recipient_email', '')
        if not recipient_string:
            logging.warning("邮件收件人未配置，无法发送邮件。")
            return False
            
        # 将逗号分隔的字符串拆分为列表，并去除多余的空格
        recipient_list = [email.strip() for email in recipient_string.split(',') if email.strip()]
        if not recipient_list:
            logging.warning("邮件收件人列表为空，无法发送邮件。")
            return False

        message = MIMEMultipart()
        message["From"] = config['sender_email']
        message["To"] = ", ".join(recipient_list) # 在邮件头中显示所有收件人
        message["Subject"] = subject
        message.attach(MIMEText(body, "plain", 'utf-8')) # 指定编码

        # 5. 连接 SMTP 服务器并发送邮件
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
                # sendmail 的第二个参数需要一个收件人列表
                server.sendmail(config['sender_email'], recipient_list, text)
        else:
            # 使用普通 SMTP 连接并启动 TLS（适用于端口 587 等）
            with smtplib.SMTP(config['smtp_server'], port) as server:
                server.starttls(context=context) # 启用 TLS 加密
                server.login(config['sender_email'], config['sender_password'])
                text = message.as_string()
                # sendmail 的第二个参数需要一个收件人列表
                server.sendmail(config['sender_email'], recipient_list, text)

        msg = f"邮件已成功发送至 {', '.join(recipient_list)}"
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
    检查即将到期的项目并发送邮件 (供后端定时任务或 API 调用)
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


def send_dingtalk_message(message):
    """
    发送钉钉消息
    :param message: 要发送的消息内容
    """
    try:
        # 1. 从数据库获取钉钉配置
        config = {}
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            for key in ['dingtalk_webhook', 'dingtalk_secret']:
                cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
                row = cursor.fetchone()
                config[key] = row[0] if row else ''

        webhook_url = config.get('dingtalk_webhook')
        secret = config.get('dingtalk_secret')

        if not webhook_url:
            logging.warning("钉钉 Webhook URL 未配置，无法发送消息。")
            return False

        # 2. 如果有密钥，进行签名
        if secret:
            timestamp = str(round(time.time() * 1000))
            secret_enc = secret.encode('utf-8')
            string_to_sign = '{}\n{}'.format(timestamp, secret)
            string_to_sign_enc = string_to_sign.encode('utf-8')
            hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
            sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
            final_webhook_url = f"{webhook_url}&timestamp={timestamp}&sign={sign}"
        else:
            final_webhook_url = webhook_url

        # 3. 准备消息内容 (Markdown 格式)
        payload = {
            "msgtype": "markdown",
            "markdown": {
                "title": "证照到期提醒",
                "text": message
            }
        }

        # 4. 发送请求
        headers = {'Content-Type': 'application/json'}
        response = requests.post(final_webhook_url, data=json.dumps(payload), headers=headers)
        response.raise_for_status()  # 如果请求失败，会抛出 HTTPError

        result = response.json()
        if result.get("errcode") == 0:
            logging.info("钉钉消息发送成功。")
            return True
        else:
            logging.error(f"钉钉消息发送失败: {result.get('errmsg')}")
            return False

    except Exception as e:
        logging.error(f"发送钉钉消息时发生错误: {e}")
        traceback.print_exc()
        return False

def check_upcoming_reminders_for_dingtalk():
    """
    检查即将到期的项目并发送钉钉消息
    """
    try:
        with sqlite3.connect(DATABASE) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM reminders ORDER BY actual_reminder_date')
            rows = cursor.fetchall()

        reminders = [dict(row) for row in rows]

        today = datetime.date.today()
        upcoming_reminders = []

        for reminder in reminders:
            try:
                actual_reminder_date = datetime.datetime.strptime(reminder['actual_reminder_date'], "%Y-%m-%d").date()
                end_date = datetime.datetime.strptime(reminder['end_date'], "%Y-%m-%d").date()

                if actual_reminder_date <= today and end_date >= today:
                    upcoming_reminders.append(reminder)
            except (ValueError, TypeError) as e:
                logging.warning(f"处理提醒项 ID {reminder.get('id', 'unknown')} 的日期时出错: {e}")

        if upcoming_reminders:
            message = "### 证照即将到期提醒\n\n"
            for reminder in upcoming_reminders:
                message += f"- **{reminder['name']}** (类型: {reminder['type']}, 到期日期: {reminder['end_date']})\n"
            
            message += "\n请登录系统查看详情。"
            
            success = send_dingtalk_message(message)
            if success:
                print("已发送钉钉提醒消息。")
            else:
                print("钉钉提醒消息发送失败。")
            return upcoming_reminders
        else:
            print("当前没有即将到期的项目。")
            return []
    except Exception as e:
        logging.error(f"检查即将到期的项目以发送钉钉消息时发生错误: {e}")
        traceback.print_exc()
        return []

# --- API Routes ---

# 创建一个装饰器来检查登录状态
def require_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 检查是否存在 X-User-Logged-In header
        if 'X-User-Logged-In' not in request.headers:
            return jsonify({'error': '未授权访问'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/reminders', methods=['GET'])
@require_login
def get_reminders():
    """获取所有提醒项"""
    try:
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM reminders ORDER BY actual_reminder_date')
            rows = cursor.fetchall()
            
            # 获取列名
            column_names = [description[0] for description in cursor.description]
            
            # 将 rows 转换为字典列表
            reminders = [dict(zip(column_names, row)) for row in rows]
            return jsonify(reminders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders', methods=['POST'])
@require_login
def add_reminder():
    """添加新提醒项"""
    try:
        data = request.get_json()
        
        # 检查必填字段
        required_fields = ['name', 'type', 'end_date', 'advance_days']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'缺少必填字段: {field}'}), 400
        
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO reminders (
                    name, type, certifier, handler, period, 
                    start_date, end_date, advance_days, actual_reminder_date,
                    auto_renew, renew_period
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['name'], data['type'], data.get('certifier'), data.get('handler'),
                data.get('period'), data.get('start_date'), data['end_date'],
                data['advance_days'], data.get('actual_reminder_date'),
                data.get('auto_renew', False), data.get('renew_period')
            ))
            conn.commit()
            new_id = cursor.lastrowid
            
        # 返回新创建的提醒项
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM reminders WHERE id = ?', (new_id,))
            row = cursor.fetchone()
            column_names = [description[0] for description in cursor.description]
            new_reminder = dict(zip(column_names, row))
            
        return jsonify(new_reminder), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders/<int:reminder_id>', methods=['PUT'])
@require_login
def update_reminder(reminder_id):
    """更新提醒项"""
    try:
        data = request.get_json()
        
        # 检查必填字段
        required_fields = ['name', 'type', 'end_date', 'advance_days']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'缺少必填字段: {field}'}), 400
        
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE reminders SET
                    name = ?, type = ?, certifier = ?, handler = ?, period = ?,
                    start_date = ?, end_date = ?, advance_days = ?, actual_reminder_date = ?,
                    auto_renew = ?, renew_period = ?
                WHERE id = ?
            ''', (
                data['name'], data['type'], data.get('certifier'), data.get('handler'),
                data.get('period'), data.get('start_date'), data['end_date'],
                data['advance_days'], data.get('actual_reminder_date'),
                data.get('auto_renew', False), data.get('renew_period'), reminder_id
            ))
            conn.commit()
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Reminder not found'}), 404
                
        # 返回更新后的提醒项
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM reminders WHERE id = ?', (reminder_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({'error': 'Reminder not found after update'}), 404
            column_names = [description[0] for description in cursor.description]
            updated_reminder = dict(zip(column_names, row))
            
        return jsonify(updated_reminder), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders/<int:reminder_id>', methods=['DELETE'])
@require_login
def delete_reminder(reminder_id):
    """删除提醒项"""
    try:
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM reminders WHERE id = ?', (reminder_id,))
            conn.commit()
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Reminder not found'}), 404
                
        return '', 204  # No Content
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reminders/export', methods=['GET'])
@require_login
def export_reminders_csv():
    """导出所有提醒项为 CSV 文件"""
    try:
        with sqlite3.connect(DATABASE) as conn:
            # 通过 row_factory 可以让查询结果的每一行像字典一样被访问
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM reminders ORDER BY actual_reminder_date')
            rows = cursor.fetchall()

        # 1. 在内存中创建一个 BytesIO 对象来写入 CSV 数据 (使用字节流)
        output = io.BytesIO()
        # 2. 创建一个 CSV writer 对象，直接写入 UTF-8 BOM 和编码的数据
        # 使用 utf-8-sig 编码的文本包装器
        wrapper = io.TextIOWrapper(output, encoding='utf-8-sig', newline='')
        writer = csv.writer(wrapper)
        
        # 3. 写入表头 (Header)
        # 根据您的数据库表结构调整表头名称和顺序
        writer.writerow([
            'ID', '名称', '类型', '认证人员', '办事员', '周期(天)', 
            '开始日期', '到期日期', '提前天数', '实际提醒日期'
        ])
        
        # 4. 写入数据行
        for row in rows:
            writer.writerow([
                row['id'], row['name'], row['type'], row['certifier'], row['handler'],
                row['period'], row['start_date'], row['end_date'], 
                row['advance_days'], row['actual_reminder_date']
            ])
        
        # 5. 关闭 TextIOWrapper 以确保所有数据都写入 BytesIO
        wrapper.flush() # 确保缓冲区数据被写入
        
        # 6. 获取字节内容
        csv_content = output.getvalue()
        output.close()
        
        # 7. 创建一个 Flask Response 对象，指定内容类型和下载文件名
        # MIME 类型为 'text/csv'，编码信息已在字节流中
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={
                "Content-Disposition": "attachment;filename=reminders_export.csv",
                # 可以添加额外的头部来明确编码
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
        
    except Exception as e:
        print(f"导出 CSV 时发生错误: {e}") # 在服务器控制台打印错误
        # 返回一个简单的文本错误信息给前端
        return f"导出失败: {str(e)}", 500

# --- 新增：导入 CSV ---
@app.route('/api/reminders/import', methods=['POST'])
@require_login
def import_reminders_csv():
    """从 CSV 文件导入提醒项"""
    try:
        # 1. 检查请求中是否包含文件
        if 'file' not in request.files:
            return jsonify({'error': '没有找到文件'}), 400
        
        file = request.files['file']
        
        # 2. 检查文件名是否为空
        if file.filename == '':
            return jsonify({'error': '未选择文件'}), 400
            
        # 3. 确认文件是CSV格式 (简单检查)
        if not file.filename.endswith('.csv'):
            return jsonify({'error': '文件类型不支持，请上传 .csv 文件'}), 400

        # 4. 读取文件内容
        # 为了解决 'SpooledTemporaryFile' object has no attribute 'readable' 的问题，
        # 我们先将文件内容读取到内存中，然后再处理
        file_content = file.read().decode('utf-8-sig')
        # 使用 StringIO 创建一个文本流
        from io import StringIO
        stream = StringIO(file_content)
        
        # 5. 使用 csv.reader 解析 CSV
        csv_reader = csv.reader(stream)
        
        # 6. 读取并跳过标题行
        headers = next(csv_reader)
        # 可以在这里验证 headers 是否符合预期
        
        # 7. 准备批量插入的数据
        reminders_to_insert = []
        line_number = 1 # 因为跳过了一行标题
        for row in csv_reader:
            line_number += 1
            # 简单的行验证，确保行有数据
            if not row or all(cell == '' for cell in row):
                print(f"警告: 第 {line_number} 行为空，已跳过。")
                continue
                
            # 根据 CSV 列的顺序解析数据
            # 假设 CSV 列顺序为: ID, 名称, 类型, 认证人员, 办事员, 周期(天), 开始日期, 到期日期, 提前天数, 实际提醒日期
            # 我们通常会忽略 ID 列，因为它由数据库自动生成
            try:
                # 确保行有足够的列
                if len(row) < 10:
                     print(f"警告: 第 {line_number} 行列数不足，已跳过。")
                     continue

                name = row[1]
                type_ = row[2]
                certifier = row[3] if row[3] else None
                handler = row[4] if row[4] else None
                # 周期可能为空
                period_str = row[5] if row[5] else None
                period = int(period_str) if period_str and period_str.isdigit() else None
                start_date = row[6] if row[6] else None
                end_date = row[7]
                advance_days_str = row[8] if row[8] else '0'  # 默认为0
                advance_days = int(advance_days_str) if advance_days_str and advance_days_str.isdigit() else 0
                actual_reminder_date = row[9] if row[9] else None
                
                # 基本验证：名称和到期日期是必需的
                if not name or not end_date:
                    print(f"警告: 第 {line_number} 行缺少必需字段 (名称或到期日期)，已跳过。")
                    continue

                reminders_to_insert.append((
                    name, type_, certifier, handler, period,
                    start_date, end_date, advance_days, actual_reminder_date
                ))
            except (ValueError, IndexError) as e:
                print(f"警告: 第 {line_number} 行数据解析错误 ({e})，已跳过。")
                continue

        # 8. 批量插入到数据库
        inserted_count = 0
        if reminders_to_insert:
            with sqlite3.connect(DATABASE) as conn:
                cursor = conn.cursor()
                # 注意：SQL 语句中的占位符应与元组中的元素一一对应
                # 这里我们没有插入 ID，因为它会自动生成
                cursor.executemany('''
                    INSERT INTO reminders (
                        name, type, certifier, handler, period, 
                        start_date, end_date, advance_days, actual_reminder_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', reminders_to_insert)
                inserted_count = cursor.rowcount
                conn.commit()
        
        # 9. 返回成功响应
        return jsonify({
            'message': f'导入成功，共新增 {inserted_count} 条记录。'
        }), 201

    except Exception as e:
        print(f"导入 CSV 时发生未预期的错误: {e}")  # 在服务器控制台打印详细错误
        import traceback
        traceback.print_exc()  # 打印完整的堆栈跟踪
        return jsonify({'error': f'导入失败: {str(e)}'}), 500
# --- 新增结束 ---

# --- Serve Static Files (Frontend) ---
# Flask 默认会从 static_folder (当前目录 '.') 查找 index.html 等静态文件
# 但我们需要处理根路径 '/' 返回 index.html
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')
    
@app.route('/app.js')
def serve_app_js():
    return send_from_directory('.', 'app.js')

# 对于其他静态资源 (如 app.js, CSS) 的请求，Flask 会自动处理

@app.route('/test_email.html')
def serve_test_email():
    return send_from_directory('.', 'test_email.html')

# --- 新增：邮箱配置和邮件发送 API ---

@app.route('/api/settings/email', methods=['GET'])
@require_login
def get_email_settings():
    """获取邮箱配置"""
    try:
        config = {}
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            for key in ['smtp_server', 'smtp_port', 'sender_email', 'sender_password', 'recipient_email']:
                cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
                row = cursor.fetchone()
                config[key] = row[0] if row else ''
        # 不返回密码
        config.pop('sender_password', None)
        return jsonify(config), 200
    except Exception as e:
        logging.error(f"获取邮箱配置失败: {e}")
        return jsonify({'error': '获取邮箱配置失败'}), 500


@app.route('/api/settings/dingtalk', methods=['GET'])
@require_login
def get_dingtalk_settings():
    """获取钉钉配置"""
    try:
        config = {}
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            for key in ['dingtalk_webhook', 'dingtalk_secret']:
                cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
                row = cursor.fetchone()
                config[key] = row[0] if row else ''
        # 不返回密钥
        config.pop('dingtalk_secret', None)
        return jsonify(config), 200
    except Exception as e:
        logging.error(f"获取钉钉配置失败: {e}")
        return jsonify({'error': '获取钉钉配置失败'}), 500


@app.route('/api/settings/email', methods=['POST'])
@require_login
def update_email_settings():
    """更新邮箱配置"""
    try:
        data = request.get_json()
        
        # 不再要求所有字段都必须提供，只更新提供的字段
        allowed_fields = ['smtp_server', 'smtp_port', 'sender_email', 'sender_password', 'recipient_email']
        fields_to_update = {}
        
        # 筛选出允许更新的字段
        for key in allowed_fields:
            if key in data:
                fields_to_update[key] = data[key]
        
        # 如果没有提供任何字段，则返回错误
        if not fields_to_update:
            return jsonify({'error': '至少需要提供一个字段进行更新'}), 400

        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            # 更新提供的字段
            for key, value in fields_to_update.items():
                # 特殊处理密码：只有当提供了新密码时才更新（即使是空字符串也更新）
                if key == 'sender_password':
                    cursor.execute(
                        "UPDATE settings SET value = ? WHERE key = ?",
                        (value, key)
                    )
                else:
                    # 对于其他字段，只有当值不是None且不是空字符串时才更新
                    if value is not None and value != "":
                        cursor.execute(
                            "UPDATE settings SET value = ? WHERE key = ?",
                            (value, key)
                        )
            conn.commit()
        return jsonify({'message': '邮箱配置更新成功'}), 200
    except Exception as e:
        logging.error(f"更新邮箱配置失败: {e}")
        return jsonify({'error': '更新邮箱配置失败'}), 500


@app.route('/api/settings/dingtalk', methods=['POST'])
@require_login
def update_dingtalk_settings():
    """更新钉钉配置"""
    try:
        data = request.get_json()
        print(f"收到钉钉配置更新请求，数据: {data}")  # 添加调试信息
        
        # 不再要求所有字段都必须提供，只更新提供的字段
        allowed_fields = ['dingtalk_webhook', 'dingtalk_secret']
        fields_to_update = {}
        
        # 筛选出允许更新的字段
        for key in allowed_fields:
            if key in data:
                fields_to_update[key] = data[key]
        
        print(f"需要更新的字段: {fields_to_update}")  # 添加调试信息
        
        # 如果没有提供任何字段，则返回错误
        if not fields_to_update:
            error_msg = '至少需要提供一个字段进行更新'
            print(f"错误: {error_msg}")  # 添加调试信息
            return jsonify({'error': error_msg}), 400

        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            # 更新提供的字段
            for key, value in fields_to_update.items():
                # 特殊处理密钥和webhook URL：允许空字符串更新
                if key in ['dingtalk_secret', 'dingtalk_webhook']:
                    print(f"更新字段 {key} 为值: '{value}'")  # 添加调试信息
                    cursor.execute(
                        "UPDATE settings SET value = ? WHERE key = ?",
                        (value, key)
                    )
                else:
                    # 对于其他字段，只有当值不是None且不是空字符串时才更新
                    if value is not None and value != "":
                        print(f"更新字段 {key} 为值: '{value}'")  # 添加调试信息
                        cursor.execute(
                            "UPDATE settings SET value = ? WHERE key = ?",
                            (value, key)
                        )
            conn.commit()
        success_msg = '钉钉配置更新成功'
        print(success_msg)  # 添加调试信息
        return jsonify({'message': success_msg}), 200
    except Exception as e:
        error_msg = f"更新钉钉配置失败: {e}"
        logging.error(error_msg)
        print(error_msg)  # 添加调试信息
        import traceback
        traceback.print_exc()  # 添加调试信息
        return jsonify({'error': '更新钉钉配置失败'}), 500

@app.route('/api/reminders/check-and-email', methods=['POST'])
@require_login
def api_check_and_email_reminders():
    """API 端点：检查即将到期项目并发送邮件"""
    try:
        print("收到检查并发送邮件的请求")
        upcoming_list = check_upcoming_reminders_for_email()
        count = len(upcoming_list)
        print(f"检查完成，发现 {count} 个即将到期项目")
        if count > 0:
            return jsonify({'message': f'检查完成，发现 {count} 个即将到期项目，并已尝试发送邮件。'}), 200
        else:
            return jsonify({'message': '检查完成，当前没有即将到期的项目。'}), 200
    except Exception as e:
        print(f"通过 API 检查并发送邮件时失败: {e}")
        import traceback
        traceback.print_exc()
        logging.error(f"通过 API 检查并发送邮件时失败: {e}")
        return jsonify({'error': '检查并发送邮件失败'}), 500


@app.route('/api/reminders/check-and-dingtalk', methods=['POST'])
@require_login
def api_check_and_dingtalk_reminders():
    """API 端点：检查即将到期项目并发送钉钉消息"""
    try:
        print("收到检查并发送钉钉消息的请求")
        print("开始调用 check_upcoming_reminders_for_dingtalk 函数")
        import traceback
        try:
            upcoming_list = check_upcoming_reminders_for_dingtalk()
        except Exception as e:
            print(f"调用 check_upcoming_reminders_for_dingtalk 时发生错误: {e}")
            traceback.print_exc()
            raise e
        print(f"check_upcoming_reminders_for_dingtalk 函数返回结果: {upcoming_list}")
        count = len(upcoming_list)
        print(f"检查完成，发现 {count} 个即将到期项目")
        if count > 0:
            return jsonify({'message': f'检查完成，发现 {count} 个即将到期项目，并已尝试发送钉钉消息。'}), 200
        else:
            return jsonify({'message': '检查完成，当前没有即将到期的项目。'}), 200
    except Exception as e:
        error_msg = f"通过 API 检查并发送钉钉消息时失败: {e}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        logging.error(error_msg)
        return jsonify({'error': '检查并发送钉钉消息失败'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.get_json()
        password = data.get('password')
        
        if not password:
            return jsonify({'error': '密码不能为空'}), 400
            
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = 'password'")
            row = cursor.fetchone()
            
            if row and row[0] == password:
                return jsonify({'message': '登录成功'}), 200
            else:
                return jsonify({'error': '密码错误'}), 401
                
    except Exception as e:
        print(f"登录时发生错误: {e}")
        return jsonify({'error': '内部服务器错误'}), 500


@app.route('/api/auth/change-password', methods=['POST'])
def change_password():
    """修改密码"""
    try:
        data = request.get_json()
        old_password = data.get('oldPassword')
        new_password = data.get('newPassword')
        
        if not old_password or not new_password:
            return jsonify({'error': '密码不能为空'}), 400
            
        with sqlite3.connect(DATABASE) as conn:
            cursor = conn.cursor()
            # 验证旧密码
            cursor.execute("SELECT value FROM settings WHERE key = 'password'")
            row = cursor.fetchone()
            
            if not row or row[0] != old_password:
                return jsonify({'error': '当前密码错误'}), 401
                
            # 更新密码
            cursor.execute(
                "UPDATE settings SET value = ? WHERE key = 'password'",
                (new_password,)
            )
            conn.commit()
            
            return jsonify({'message': '密码修改成功'}), 200
            
    except Exception as e:
        print(f"修改密码时发生错误: {e}")
        return jsonify({'error': '内部服务器错误'}), 500

# --- 新增结束 ---

if __name__ == '__main__':
    # 注意：在 Docker 中，通常监听 0.0.0.0
    app.run(host='0.0.0.0', port=5009, debug=True)