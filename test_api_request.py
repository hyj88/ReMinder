import requests
import json

# 测试更新邮箱配置
url = 'http://localhost:5009/api/settings/email'
headers = {
    'Content-Type': 'application/json',
    'X-User-Logged-In': 'true'  # 模拟已登录状态
}

# 测试数据
data = {
    'smtp_server': 'smtp.gmail.com',
    'smtp_port': '587',
    'sender_email': 'test@example.com',
    'sender_password': 'testpassword',
    'recipient_email': 'recipient@example.com'
}

print(f"发送请求到: {url}")
print(f"请求头: {headers}")
print(f"请求数据: {data}")

try:
    response = requests.post(url, headers=headers, data=json.dumps(data))
    print(f"响应状态码: {response.status_code}")
    print(f"响应内容: {response.text}")
except Exception as e:
    print(f"请求失败: {e}")