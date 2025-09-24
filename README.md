# 证照到期提醒工具 / Certificate Expiry Reminder Tool

[English](#english-version)

---

这是一个简单而实用的 Web 应用，用于追踪和管理各类证照、资质或许可证的到期日，并通过电子邮件和钉钉机器人发送自动提醒。

## 主要功能

- **Web 操作界面**: 通过浏览器轻松添加、编辑、删除和查看所有提醒项目。
- **自动提醒**: 根据您设定的提前天数，自动判断并发送到期提醒。
- **多渠道通知**:
    - **邮件**: 支持向多个收件人批量发送提醒邮件。
    - **钉钉**: 支持使用加签密钥的钉钉群机器人发送提醒。
- **数据管理**:
    - 支持从 CSV 文件批量导入数据。
    - 支持将所有数据导出为 CSV 文件，方便备份和迁移。
- **安全与配置**:
    - 提供简单的密码登录保护。
    - 所有配置（邮箱、钉钉、密码）均可在 Web 界面上完成。
- **Docker 支持**: 提供 Dockerfile，方便快速、跨平台地打包和部署。

## 技术栈

- **后端**: Python, Flask
- **前端**: HTML, CSS, JavaScript, Bootstrap 5
- **数据库**: SQLite

## 本地运行指南

1.  **克隆或下载项目**

2.  **创建并激活 Python 虚拟环境**
    ```bash
    # 创建虚拟环境
    python3 -m venv venv
    # 激活虚拟环境
    source venv/bin/activate
    ```

3.  **安装依赖**
    ```bash
    pip install -r requirements.txt
    ```

4.  **运行应用**
    ```bash
    python app.py
    ```

5.  **访问应用**
    在浏览器中打开 `http://localhost:5009`。初始登录密码为 `unimedia`。

## Docker 部署指南

使用 Docker 是推荐的部署方式，它可以保证环境的一致性。

1.  **构建 Docker 镜像**
    ```bash
    # 在您当前的平台上构建
    docker build -t reminder-app .
    ```
    如果您需要在与您电脑 CPU 架构不同的机器上（例如，在 ARM 架构的 Mac 上为 x86_64 架构的群晖 NAS 构建）运行，请使用以下命令进行交叉编译：
    ```bash
    # 为 x86_64/amd64 平台构建
    docker buildx build --platform linux/amd64 -t reminder-app-amd64 . --load
    ```

2.  **运行 Docker 容器**
    ```bash
    docker run -d -p 5009:5009 -v "$(pwd)/reminders.db":/app/reminders.db --name reminder-container reminder-app
    ```
    **重要**: `-v "$(pwd)/reminders.db":/app/reminders.db` 这部分命令将您本地的数据库文件挂载到容器中，**确保数据持久化**。如果您在群晖等其他平台上运行，请确保将左侧的路径替换为您实际存放 `reminders.db` 文件的路径。

3.  **访问应用**
    在浏览器中打开 `http://<您的服务器IP>:5009`。

---

# English Version

This is a simple and practical web application for tracking and managing the expiration dates of various certificates and licenses, sending automatic reminders via email and DingTalk.

## Features

- **Web Interface**: Easily add, edit, delete, and view all reminder items through a browser.
- **Automatic Reminders**: Automatically determines and sends expiration reminders based on the advance days you set.
- **Multi-channel Notifications**:
    - **Email**: Supports sending reminder emails to multiple recipients in bulk.
    - **DingTalk**: Supports sending reminders using a DingTalk group robot with a signature key.
- **Data Management**:
    - Supports bulk data import from a CSV file.
    - Supports exporting all data to a CSV file for easy backup and migration.
- **Security & Configuration**:
    - Provides simple password protection for the login.
    - All configurations (Email, DingTalk, Password) can be done through the web interface.
- **Docker Support**: Comes with a Dockerfile for quick, cross-platform packaging and deployment.

## Tech Stack

- **Backend**: Python, Flask
- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5
- **Database**: SQLite

## Getting Started (Local Development)

1.  **Clone or download the project.**

2.  **Create and activate a Python virtual environment.**
    ```bash
    # Create virtual environment
    python3 -m venv venv
    # Activate virtual environment
    source venv/bin/activate
    ```

3.  **Install dependencies.**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the application.**
    ```bash
    python app.py
    ```

5.  **Access the application.**
    Open `http://localhost:5009` in your browser. The initial password is `unimedia`.

## Docker Deployment Guide

Using Docker is the recommended way to deploy this application as it ensures a consistent environment.

1.  **Build the Docker Image.**
    ```bash
    # Build for your current platform
    docker build -t reminder-app .
    ```
    If you need to run the container on a machine with a different CPU architecture (e.g., building for an x86_64 Synology NAS on an ARM-based Mac), use the following command for cross-compilation:
    ```bash
    # Build for the x86_64/amd64 platform
    docker buildx build --platform linux/amd64 -t reminder-app-amd64 . --load
    ```

2.  **Run the Docker Container.**
    ```bash
    docker run -d -p 5009:5009 -v "$(pwd)/reminders.db":/app/reminders.db --name reminder-container reminder-app
    ```
    **Important**: The `-v "$(pwd)/reminders.db":/app/reminders.db` part mounts your local database file into the container, **ensuring data persistence**. If you are running this on another platform like Synology, make sure to replace the path on the left with the actual path to your `reminders.db` file.

3.  **Access the application.**
    Open `http://<Your-Server-IP>:5009` in your browser.
