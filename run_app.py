# run_app.py
import os
import sys
import threading
import time
import schedule
from app import app, check_upcoming_reminders_for_email

def run_scheduler():
    """运行定时任务调度器"""
    # 每天上午9点执行一次检查和通知
    schedule.every().day.at("09:00").do(check_upcoming_reminders_for_email)
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # 每分钟检查一次

if __name__ == "__main__":
    # 在单独的线程中运行定时任务调度器
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    # 启动 Flask 应用
    app.run(host='0.0.0.0', port=5009, debug=False)