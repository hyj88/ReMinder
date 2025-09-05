import requests
import json

# 测试直接调用后端API发送邮件
url = 'http://localhost:5009/api/reminders/check-and-email'
headers = {
    'Content-Type': 'application/json',
    'X-User-Logged-In': 'true'
}

print(f"发送请求到: {url}")
print(f"请求头: {headers}")

try:
    response = requests.post(url, headers=headers)
    print(f"响应状态码: {response.status_code}")
    print(f"响应内容: {response.text}")
except Exception as e:
    print(f"请求失败: {e}")