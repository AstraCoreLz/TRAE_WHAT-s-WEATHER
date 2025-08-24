from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from supabase import create_client, Client
from config import Config
from auth import GitHubAuth
from api import api_bp
import requests
import secrets
from datetime import datetime, timedelta

# 创建Flask应用
app = Flask(__name__)
app.config.from_object(Config)

# 启用CORS
CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

# 初始化Supabase客户端
supabase: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY)
supabase_admin: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)

# 初始化GitHub认证
auth = GitHubAuth(app)

# 注册API蓝图
app.register_blueprint(api_bp)

# ==================== 用户认证辅助函数 ====================

def get_current_user():
    """获取当前登录用户"""
    return auth.get_current_user()

def require_auth(f):
    """装饰器：要求用户登录"""
    return auth.require_auth(f)

# 主页路由
@app.route('/')
def index():
    """主页 - 显示情绪地图"""
    user = get_current_user()
    return render_template('index.html', user=user)

@app.route('/profile')
@require_auth
def profile():
    """个人页面"""
    user = get_current_user()
    return render_template('profile.html', user=user)

@app.route('/emotion/<int:emotion_id>')
def emotion_detail(emotion_id):
    """情绪详情页面"""
    user = get_current_user()
    return render_template('emotion_detail.html', user=user, emotion_id=emotion_id)

@app.route('/add_emotion')
@require_auth
def add_emotion():
    """添加情绪页面"""
    user = get_current_user()
    return render_template('add_emotion.html', user=user)

# GitHub OAuth路由已在auth.py中通过add_url_rule注册
# 路由包括：/login/github, /login/github/authorized, /logout

# OAuth配置诊断页面
@app.route('/debug/oauth')
def debug_oauth():
    """OAuth配置诊断页面"""
    return render_template('debug_oauth.html',
                         github_client_id=app.config.get('GITHUB_CLIENT_ID'),
                         github_client_secret=app.config.get('GITHUB_CLIENT_SECRET'),
                         github_redirect_uri=app.config.get('GITHUB_REDIRECT_URI'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)