#!/usr/bin/env python3
import time
import schedule
import sys
import os

# 添加项目目录到 Python 路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from email_utils import check_upcoming_reminders_for_dingtalk

def run_scheduler():
    """运行定时任务调度器"""
    # 每天上午9点执行一次检查和通知
    schedule.every().day.at("09:00").do(check_upcoming_reminders_for_dingtalk)
    
    print("定时任务已启动，每天上午9点将检查即将到期的项目并发送钉钉消息。")
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # 每分钟检查一次

if __name__ == "__main__":
    run_scheduler()