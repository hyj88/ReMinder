[README.md](https://github.com/user-attachments/files/22168445/README.md)

<img width="2830" height="1254" alt="image" src="https://github.com/user-attachments/assets/8952ab1f-c4e4-4787-90a9-c576a4364877" />

# Reminder Application (提醒应用)

A Python and JavaScript-based reminder application with email notifications.

一个基于 Python 和 JavaScript 的提醒应用，支持邮件通知。

## Features (功能)

- Create and manage reminders (创建和管理提醒)
- Email notifications for upcoming reminders (即将到来的提醒邮件通知)
- Web-based interface for easy access (基于Web的界面，便于访问)
- Docker support for easy deployment (支持Docker，便于部署)

## Technologies Used (使用的技术)

- Python 3
- JavaScript
- HTML/CSS
- Docker
- SQLite database (SQLite数据库)

## Setup (设置)

### Prerequisites (先决条件)

- Python 3.7 or higher (Python 3.7或更高版本)
- Node.js (for any Node-based utilities) (用于基于Node的工具)
- Docker (optional, for containerized deployment) (可选，用于容器化部署)

### Installation (安装)

1. Clone the repository (克隆仓库):
   ```
   git clone <repository-url>
   cd tixing
   ```

2. Create a virtual environment and activate it (创建虚拟环境并激活):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate` (在Windows上使用 `venv\Scripts\activate`)
   ```

3. Install the required Python packages (安装所需的Python包):
   ```
   pip install -r requirements.txt
   ```

4. Configure email settings (配置邮件设置):
   - Update `email_config_api.py` with your email SMTP settings (使用您的邮件SMTP设置更新 `email_config_api.py`)
   - Or create a `config.json` file with your email credentials (或创建一个包含您邮件凭证的 `config.json` 文件)

### Running the Application (运行应用)

1. Start the Python backend (启动Python后端):
   ```
   python app.py
   ```

2. Open `index.html` in your browser to access the web interface (在浏览器中打开 `index.html` 访问Web界面)

### Running with Docker (使用Docker运行)

1. Build the Docker image (构建Docker镜像):
   ```
   docker build -t reminder-app .
   ```

2. Run the container (运行容器):
   ```
   docker run -p 8000:8000 reminder-app
   ```

## Usage (使用方法)

1. Open the web interface in your browser (在浏览器中打开Web界面)
2. Add new reminders with dates and descriptions (添加带日期和描述的新提醒)
3. The application will send email notifications before the reminder time (应用将在提醒时间前发送邮件通知)
4. View and manage existing reminders through the interface (通过界面查看和管理现有提醒)

## Configuration (配置)

- Email settings can be configured in `email_config_api.py` (邮件设置可以在 `email_config_api.py` 中配置)
- Database location is managed in `reminders.db` (数据库位置在 `reminders.db` 中管理)
- Service configuration in `com.reminder.service.plist` (服务配置在 `com.reminder.service.plist` 中)

## Project Structure (项目结构)

- `app.py` - Main Python application (主Python应用)
- `app.js` - Client-side JavaScript (客户端JavaScript)
- `index.html` - Main interface (主界面)
- `email_utils.py` - Email sending functionality (邮件发送功能)
- `send_reminders.py` - Scheduled reminder sending (定时提醒发送)
- `reminders.db` - SQLite database file (SQLite数据库文件)

## Contributing (贡献)

1. Fork the repository (派生仓库)
2. Create a feature branch (创建功能分支)
3. Commit your changes (提交更改)
4. Push to the branch (推送到分支)
5. Create a pull request (创建拉取请求)

## License (许可证)

This project is licensed under the MIT License - see the LICENSE file for details.

本项目采用MIT许可证 - 详情请见LICENSE文件。
