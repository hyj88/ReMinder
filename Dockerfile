# 使用官方 Python 运行时作为基础镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 将 requirements.txt 复制到容器中
COPY requirements.txt requirements.txt

# 在容器中安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 将当前目录内容复制到容器的 /app 目录中
COPY . .

# 让 Docker 在容器启动时执行 Python 脚本
CMD [ "python", "app.py" ]

# 指定容器运行时监听的端口
EXPOSE 5009