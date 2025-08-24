# 部署指南

本文档提供了情绪分享平台的部署配置和说明。

## 部署选项

### 1. Heroku 部署

#### 准备文件

创建 `Procfile`：
```
web: python app.py
```

创建 `runtime.txt`：
```
python-3.11.0
```

#### 部署步骤

1. **安装 Heroku CLI**
```bash
# 下载并安装 Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli
```

2. **登录 Heroku**
```bash
heroku login
```

3. **创建应用**
```bash
heroku create your-app-name
```

4. **设置环境变量**
```bash
heroku config:set FLASK_SECRET_KEY=your-secret-key
heroku config:set GITHUB_CLIENT_ID=your-github-client-id
heroku config:set GITHUB_CLIENT_SECRET=your-github-client-secret
heroku config:set GITHUB_REDIRECT_URI=https://your-app-name.herokuapp.com/auth/callback
heroku config:set SUPABASE_URL=your-supabase-url
heroku config:set SUPABASE_ANON_KEY=your-supabase-anon-key
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

5. **部署应用**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### 2. Vercel 部署

#### 准备文件

创建 `vercel.json`：
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.py"
    }
  ],
  "env": {
    "FLASK_SECRET_KEY": "@flask_secret_key",
    "GITHUB_CLIENT_ID": "@github_client_id",
    "GITHUB_CLIENT_SECRET": "@github_client_secret",
    "GITHUB_REDIRECT_URI": "@github_redirect_uri",
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_ANON_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key"
  }
}
```

#### 部署步骤

1. **安装 Vercel CLI**
```bash
npm i -g vercel
```

2. **登录 Vercel**
```bash
vercel login
```

3. **设置环境变量**
```bash
vercel env add FLASK_SECRET_KEY
vercel env add GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET
vercel env add GITHUB_REDIRECT_URI
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

4. **部署应用**
```bash
vercel --prod
```

### 3. Docker 部署

#### 创建 Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
```

#### 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_SECRET_KEY=${FLASK_SECRET_KEY}
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - GITHUB_REDIRECT_URI=${GITHUB_REDIRECT_URI}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    volumes:
      - .:/app
    restart: unless-stopped
```

#### 部署步骤

1. **构建镜像**
```bash
docker build -t emotion-share-platform .
```

2. **运行容器**
```bash
docker-compose up -d
```

### 4. VPS 部署

#### 使用 Nginx + Gunicorn

1. **安装依赖**
```bash
sudo apt update
sudo apt install python3 python3-pip nginx
pip3 install gunicorn
```

2. **创建 Gunicorn 配置**

创建 `gunicorn.conf.py`：
```python
bind = "127.0.0.1:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
preload_app = True
```

3. **创建 systemd 服务**

创建 `/etc/systemd/system/emotion-share.service`：
```ini
[Unit]
Description=Emotion Share Platform
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/emotion-share-platform
Environment="PATH=/var/www/emotion-share-platform/venv/bin"
ExecStart=/var/www/emotion-share-platform/venv/bin/gunicorn -c gunicorn.conf.py app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

4. **配置 Nginx**

创建 `/etc/nginx/sites-available/emotion-share`：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/emotion-share-platform/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

5. **启用服务**
```bash
sudo systemctl enable emotion-share
sudo systemctl start emotion-share
sudo ln -s /etc/nginx/sites-available/emotion-share /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

## 环境变量配置

### 生产环境变量

```env
# Flask配置
FLASK_SECRET_KEY=your-production-secret-key
FLASK_DEBUG=False
FLASK_ENV=production

# GitHub OAuth配置
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=https://your-domain.com/auth/callback

# Supabase配置
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# 其他配置
PORT=5000
HOST=0.0.0.0
```

## 安全配置

### 1. HTTPS 配置

使用 Let's Encrypt 获取免费SSL证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2. 防火墙配置

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 3. 安全头配置

在 Nginx 配置中添加：

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## 监控和日志

### 1. 应用日志

在 `app.py` 中配置日志：

```python
import logging
from logging.handlers import RotatingFileHandler

if not app.debug:
    file_handler = RotatingFileHandler('logs/emotion-share.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
```

### 2. 系统监控

使用 `htop` 和 `iotop` 监控系统资源：

```bash
sudo apt install htop iotop
```

### 3. 应用监控

使用 `supervisor` 管理进程：

```bash
sudo apt install supervisor
```

创建 `/etc/supervisor/conf.d/emotion-share.conf`：

```ini
[program:emotion-share]
command=/var/www/emotion-share-platform/venv/bin/gunicorn -c gunicorn.conf.py app:app
directory=/var/www/emotion-share-platform
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/emotion-share.log
```

## 备份策略

### 1. 数据库备份

Supabase 提供自动备份功能，也可以手动导出：

```sql
-- 导出数据
COPY (SELECT * FROM users) TO '/tmp/users_backup.csv' WITH CSV HEADER;
COPY (SELECT * FROM emotions) TO '/tmp/emotions_backup.csv' WITH CSV HEADER;
```

### 2. 代码备份

使用 Git 进行版本控制：

```bash
git add .
git commit -m "Production deployment"
git push origin main
```

### 3. 配置备份

定期备份配置文件：

```bash
tar -czf config_backup_$(date +%Y%m%d).tar.gz .env nginx.conf gunicorn.conf.py
```

## 性能优化

### 1. 缓存配置

使用 Redis 进行缓存：

```python
import redis
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'redis'})
```

### 2. 静态文件优化

使用 CDN 加速静态文件：

```nginx
location /static {
    alias /var/www/emotion-share-platform/static;
    expires 1y;
    add_header Cache-Control "public, immutable";
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
}
```

### 3. 数据库优化

- 添加适当的索引
- 使用连接池
- 定期分析查询性能

## 故障排除

### 常见问题

1. **应用无法启动**
   - 检查环境变量配置
   - 查看应用日志
   - 验证依赖安装

2. **数据库连接失败**
   - 检查 Supabase 配置
   - 验证网络连接
   - 检查防火墙设置

3. **OAuth 认证失败**
   - 验证 GitHub 应用配置
   - 检查回调 URL
   - 确认客户端密钥

### 日志查看

```bash
# 查看应用日志
sudo journalctl -u emotion-share -f

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 查看系统日志
sudo tail -f /var/log/syslog
```

---

**注意**: 部署到生产环境前，请确保已经充分测试所有功能，并配置好安全措施。