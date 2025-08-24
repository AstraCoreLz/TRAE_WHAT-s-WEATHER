import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Config:
    """Flask应用配置类"""
    
    # Flask基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # Supabase配置
    SUPABASE_URL = 'https://gszapzuzswvtittxjdqc.supabase.co'
    SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzemFwenV6c3d2dGl0dHhqZHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODc5NzQsImV4cCI6MjA3MTU2Mzk3NH0.1nydt2fkV8bKSCeljASO6c8dNvp1lGO3PaZX97fOSwk'
    SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzemFwenV6c3d2dGl0dHhqZHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk4Nzk3NCwiZXhwIjoyMDcxNTYzOTc0fQ.Qdvo-vdEhshkL0yNrbOW9LqVwiiiubsl4ZPy6UGE1mQ'
    
    # GitHub OAuth配置
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID') or 'your-github-client-id'
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET') or 'your-github-client-secret'
    GITHUB_REDIRECT_URI = os.environ.get('GITHUB_REDIRECT_URI') or 'http://localhost:5000/login/github/authorized'
    
    # 应用配置
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB最大文件上传大小
    MAX_EMOTION_LENGTH = 200  # 情绪文字最大长度
    COMMENT_MAX_LENGTH = 500  # 评论最大长度
    
    # CORS配置
    CORS_ORIGINS = ['http://localhost:5000', 'http://127.0.0.1:5000']