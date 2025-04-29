# 使用官方 Python 3.9 映像作為基礎
FROM python:3.9-slim

# 設置工作目錄
WORKDIR /app

# 安裝運行環境所需的套件
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 複製依賴文件
COPY requirements.txt .

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程式代碼
COPY . .

# 設置環境變數
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# 暴露端口
EXPOSE $PORT

# 啟動命令
# 使用 gunicorn 運行應用，設置適當的工作進程和線程
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
