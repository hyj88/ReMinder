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
                    # 对于其他字段，只有当值不是None时才更新
                    if value is not None:
                        cursor.execute(
                            "UPDATE settings SET value = ? WHERE key = ?",
                            (value, key)
                        )
            conn.commit()
        return jsonify({'message': '邮箱配置更新成功'}), 200
    except Exception as e:
        logging.error(f"更新邮箱配置失败: {e}")
        return jsonify({'error': '更新邮箱配置失败'}), 500

# --- 新增结束 ---