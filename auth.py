# GitHub OAuth认证系统
import requests
import secrets
from flask import session, request, redirect, url_for, jsonify
from datetime import datetime, timedelta
from config import Config
from supabase import create_client, Client

class GitHubAuth:
    def __init__(self, app=None):
        self.app = app
        self.supabase = None
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """初始化认证系统"""
        self.app = app
        self.supabase = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_SERVICE_ROLE_KEY
        )
        
        # 注册路由
        app.add_url_rule('/login/github', 'auth_login', self.login)
        app.add_url_rule('/login/github/authorized', 'auth_callback', self.callback)
        app.add_url_rule('/logout', 'auth_logout', self.logout, methods=['POST'])
        app.add_url_rule('/api/user/profile', 'user_profile', self.get_user_profile)
    
    def generate_state(self):
        """生成随机状态码用于防止CSRF攻击"""
        state = secrets.token_urlsafe(32)
        session['oauth_state'] = state
        return state
    
    def login(self):
        """GitHub OAuth登录"""
        state = self.generate_state()
        
        # GitHub OAuth授权URL
        github_auth_url = (
            f"https://github.com/login/oauth/authorize?"
            f"client_id={Config.GITHUB_CLIENT_ID}&"
            f"redirect_uri={Config.GITHUB_REDIRECT_URI}&"
            f"scope=user:email&"
            f"state={state}"
        )
        
        return redirect(github_auth_url)
    
    def callback(self):
        """GitHub OAuth回调处理"""
        print("开始处理GitHub OAuth回调")
        
        # 验证状态码
        state = request.args.get('state')
        stored_state = session.get('oauth_state')
        print(f"接收到的state: {state}")
        print(f"存储的state: {stored_state}")
        
        if not state or state != stored_state:
            print("状态码验证失败")
            return jsonify({'error': '无效的状态码，可能存在CSRF攻击'}), 400
        
        # 清除状态码
        session.pop('oauth_state', None)
        
        # 检查是否有错误参数
        error = request.args.get('error')
        if error:
            error_description = request.args.get('error_description', '')
            print(f"GitHub OAuth错误: {error} - {error_description}")
            return jsonify({'error': f'GitHub授权失败: {error} - {error_description}'}), 400
        
        # 获取授权码
        code = request.args.get('code')
        if not code:
            print("未收到授权码")
            return jsonify({'error': 'GitHub授权失败: 未收到授权码'}), 400
        
        print(f"收到授权码: {code[:10]}...")
        
        try:
            # 交换访问令牌
            print("正在交换访问令牌...")
            access_token = self.exchange_code_for_token(code)
            if not access_token:
                print("访问令牌获取失败")
                return jsonify({
                    'error': '获取访问令牌失败',
                    'details': '请检查GitHub OAuth应用配置，特别是Client Secret是否正确设置'
                }), 400
            
            # 获取用户信息
            print("正在获取用户信息...")
            user_info = self.get_github_user_info(access_token)
            if not user_info:
                print("用户信息获取失败")
                return jsonify({'error': '获取用户信息失败'}), 400
            
            print(f"获取到用户信息: {user_info.get('username')}")
            
            # 创建或更新用户
            print("正在创建或更新用户...")
            user = self.create_or_update_user(user_info, access_token)
            if not user:
                print("用户创建失败")
                return jsonify({'error': '用户创建失败'}), 500
            
            print(f"用户创建/更新成功: {user.get('username')}")
            
            # 设置会话
            self.set_user_session(user)
            print("用户会话设置成功")
            
            # 重定向到首页
            return redirect('/')
            
        except Exception as e:
            print(f"OAuth回调错误: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'error': '认证过程中发生错误',
                'details': str(e)
            }), 500
    
    def exchange_code_for_token(self, code):
        """交换授权码获取访问令牌"""
        token_url = 'https://github.com/login/oauth/access_token'
        
        # 检查必要的配置
        if not Config.GITHUB_CLIENT_ID or Config.GITHUB_CLIENT_ID == 'your-github-client-id':
            print("错误: GitHub Client ID未配置")
            return None
            
        if not Config.GITHUB_CLIENT_SECRET or len(Config.GITHUB_CLIENT_SECRET.strip()) == 0:
            print("错误: GitHub Client Secret未配置")
            print("请在.env文件中设置正确的GITHUB_CLIENT_SECRET")
            return None
        
        data = {
            'client_id': Config.GITHUB_CLIENT_ID,
            'client_secret': Config.GITHUB_CLIENT_SECRET,
            'code': code,
            'redirect_uri': Config.GITHUB_REDIRECT_URI
        }
        
        headers = {
            'Accept': 'application/json',
            'User-Agent': 'EmotionShare-App'
        }
        
        print(f"正在请求访问令牌，Client ID: {Config.GITHUB_CLIENT_ID[:8]}...")
        
        try:
            response = requests.post(token_url, data=data, headers=headers, timeout=10)
            print(f"GitHub API响应状态码: {response.status_code}")
            
            if response.status_code != 200:
                print(f"GitHub API错误响应: {response.text}")
                return None
            
            token_data = response.json()
            print(f"GitHub API响应数据: {token_data}")
            
            if 'error' in token_data:
                print(f"GitHub OAuth错误: {token_data.get('error_description', token_data.get('error'))}")
                return None
            
            access_token = token_data.get('access_token')
            if access_token:
                print("成功获取访问令牌")
                return access_token
            else:
                print("响应中未找到访问令牌")
                return None
            
        except requests.RequestException as e:
            print(f"获取访问令牌失败: {e}")
            return None
    
    def get_github_user_info(self, access_token):
        """获取GitHub用户信息（带重试机制）"""
        import time
        
        user_url = 'https://api.github.com/user'
        email_url = 'https://api.github.com/user/emails'
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'EmotionShare-App',
            'Connection': 'close'  # 避免连接复用问题
        }
        
        # 重试配置
        max_retries = 3
        retry_delay = 1  # 秒
        
        for attempt in range(max_retries):
            try:
                print(f"尝试获取GitHub用户信息 (第{attempt + 1}次)...")
                
                # 获取用户基本信息
                print("正在获取用户基本信息...")
                user_response = requests.get(
                    user_url, 
                    headers=headers, 
                    timeout=15,
                    verify=True
                )
                user_response.raise_for_status()
                user_data = user_response.json()
                print(f"成功获取用户基本信息: {user_data.get('login')}")
                
                # 获取用户邮箱
                print("正在获取用户邮箱信息...")
                email_response = requests.get(
                    email_url, 
                    headers=headers, 
                    timeout=15,
                    verify=True
                )
                email_response.raise_for_status()
                email_data = email_response.json()
                print(f"成功获取邮箱信息，共{len(email_data)}个邮箱")
                
                # 找到主邮箱
                primary_email = None
                for email_info in email_data:
                    if email_info.get('primary', False):
                        primary_email = email_info.get('email')
                        break
                
                if not primary_email and email_data:
                    primary_email = email_data[0].get('email')
                
                user_info = {
                    'github_id': user_data.get('id'),
                    'username': user_data.get('login'),
                    'display_name': user_data.get('name') or user_data.get('login'),
                    'email': primary_email,
                    'avatar_url': user_data.get('avatar_url'),
                    'github_url': user_data.get('html_url')
                }
                
                print(f"成功获取完整用户信息: {user_info['username']}")
                return user_info
                
            except requests.exceptions.ConnectionError as e:
                print(f"连接错误 (第{attempt + 1}次尝试): {e}")
                if attempt < max_retries - 1:
                    print(f"等待{retry_delay}秒后重试...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # 指数退避
                else:
                    print("所有重试都失败了")
                    return None
                    
            except requests.exceptions.Timeout as e:
                print(f"请求超时 (第{attempt + 1}次尝试): {e}")
                if attempt < max_retries - 1:
                    print(f"等待{retry_delay}秒后重试...")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    print("所有重试都失败了")
                    return None
                    
            except requests.exceptions.HTTPError as e:
                print(f"HTTP错误: {e}")
                print(f"响应状态码: {e.response.status_code}")
                print(f"响应内容: {e.response.text}")
                return None
                
            except requests.RequestException as e:
                print(f"请求异常 (第{attempt + 1}次尝试): {e}")
                if attempt < max_retries - 1:
                    print(f"等待{retry_delay}秒后重试...")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    print("所有重试都失败了")
                    return None
                    
            except Exception as e:
                print(f"未知错误: {e}")
                import traceback
                traceback.print_exc()
                return None
        
        return None
    
    def create_or_update_user(self, user_info, access_token):
        """创建或更新用户"""
        try:
            github_username = user_info['username']
            
            # 检查用户是否已存在（根据github_username）
            existing_user = self.supabase.table('users').select('*').eq('github_username', github_username).execute()
            
            # 准备用户数据（匹配数据库字段）
            user_data = {
                'github_username': github_username,
                'bio': user_info.get('display_name', ''),  # 使用bio字段存储显示名称
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if existing_user.data:
                # 更新现有用户
                user_id = existing_user.data[0]['user_id']
                result = self.supabase.table('users').update(user_data).eq('user_id', user_id).execute()
                if result.data:
                    # 返回标准化的用户数据
                    user = result.data[0]
                    return {
                        'id': user['user_id'],
                        'username': user['github_username'],
                        'display_name': user.get('bio', user['github_username']),
                        'email': user_info.get('email'),
                        'avatar_url': user_info.get('avatar_url'),
                        'github_url': user_info.get('github_url'),
                        'created_at': user.get('created_at'),
                        'updated_at': user.get('updated_at')
                    }
                return None
            else:
                # 创建新用户
                user_data['created_at'] = datetime.utcnow().isoformat()
                result = self.supabase.table('users').insert(user_data).execute()
                if result.data:
                    # 返回标准化的用户数据
                    user = result.data[0]
                    return {
                        'id': user['user_id'],
                        'username': user['github_username'],
                        'display_name': user.get('bio', user['github_username']),
                        'email': user_info.get('email'),
                        'avatar_url': user_info.get('avatar_url'),
                        'github_url': user_info.get('github_url'),
                        'created_at': user.get('created_at'),
                        'updated_at': user.get('updated_at')
                    }
                return None
                
        except Exception as e:
            print(f"创建或更新用户失败: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def set_user_session(self, user):
        """设置用户会话"""
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['display_name'] = user['display_name']
        session['avatar_url'] = user['avatar_url']
        session['is_authenticated'] = True
        
        # 设置会话过期时间（7天）
        session.permanent = True
        session.permanent_session_lifetime = timedelta(days=7)
    
    def logout(self):
        """用户登出"""
        session.clear()
        # 重定向到主页，并通过URL参数传递成功消息
        return redirect('/?logout=success')
    
    def get_current_user(self):
        """获取当前登录用户"""
        if not session.get('is_authenticated'):
            return None
        
        user_id = session.get('user_id')
        if not user_id:
            return None
        
        try:
            result = self.supabase.table('users').select('*').eq('user_id', user_id).execute()
            if result.data:
                user = result.data[0]
                # 返回标准化的用户数据
                return {
                    'id': user['user_id'],
                    'username': user['github_username'],
                    'display_name': user.get('bio', user['github_username']),
                    'email': session.get('email', ''),
                    'avatar_url': session.get('avatar_url', ''),
                    'github_url': session.get('github_url', ''),
                    'created_at': user.get('created_at'),
                    'updated_at': user.get('updated_at')
                }
            return None
        except Exception as e:
            print(f"获取当前用户失败: {e}")
            return None
    
    def get_user_profile(self):
        """获取用户资料API"""
        user = self.get_current_user()
        if not user:
            return jsonify({'error': '未登录'}), 401
        
        # 移除敏感信息
        safe_user = {
            'id': user['id'],
            'username': user['username'],
            'display_name': user['display_name'],
            'email': user['email'],
            'avatar_url': user['avatar_url'],
            'github_url': user['github_url'],
            'created_at': user['created_at'],
            'last_login': user['last_login']
        }
        
        return jsonify({'user': safe_user})
    
    def require_auth(self, f):
        """装饰器：要求用户登录"""
        def decorated_function(*args, **kwargs):
            if not session.get('is_authenticated'):
                # 检查是否是API请求（通过请求路径或Accept头判断）
                if request.path.startswith('/api/') or request.headers.get('Accept', '').startswith('application/json'):
                    return jsonify({'error': '需要登录'}), 401
                else:
                    # 对于页面请求，重定向到主页并显示登录提示
                    return redirect('/?login_required=true')
            return f(*args, **kwargs)
        decorated_function.__name__ = f.__name__
        return decorated_function
    
    def get_user_by_id(self, user_id):
        """根据ID获取用户信息"""
        try:
            result = self.supabase.table('users').select('*').eq('user_id', user_id).execute()
            if result.data:
                user = result.data[0]
                # 返回标准化的用户数据
                return {
                    'id': user['user_id'],
                    'username': user['github_username'],
                    'display_name': user.get('bio', user['github_username']),
                    'email': '',  # 数据库中没有存储邮箱
                    'avatar_url': '',  # 数据库中没有存储头像
                    'github_url': '',  # 数据库中没有存储GitHub链接
                    'created_at': user.get('created_at'),
                    'updated_at': user.get('updated_at')
                }
            return None
        except Exception as e:
            print(f"获取用户信息失败: {e}")
            return None
    
    def update_user_profile(self, user_id, profile_data):
        """更新用户资料"""
        try:
            # 只允许更新bio字段（对应display_name）
            update_data = {}
            if 'display_name' in profile_data:
                update_data['bio'] = profile_data['display_name']
            
            if not update_data:
                return None
            
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            result = self.supabase.table('users').update(update_data).eq('user_id', user_id).execute()
            if result.data:
                user = result.data[0]
                # 返回标准化的用户数据
                return {
                    'id': user['user_id'],
                    'username': user['github_username'],
                    'display_name': user.get('bio', user['github_username']),
                    'created_at': user.get('created_at'),
                    'updated_at': user.get('updated_at')
                }
            return None
            
        except Exception as e:
            print(f"更新用户资料失败: {e}")
            return None
    
    def refresh_user_token(self, user_id, new_token):
        """刷新用户访问令牌（注意：当前数据库结构不支持存储token）"""
        try:
            # 当前数据库结构不支持存储access_token，只更新时间戳
            update_data = {
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table('users').update(update_data).eq('user_id', user_id).execute()
            if result.data:
                user = result.data[0]
                return {
                    'id': user['user_id'],
                    'username': user['github_username'],
                    'display_name': user.get('bio', user['github_username']),
                    'updated_at': user.get('updated_at')
                }
            return None
            
        except Exception as e:
            print(f"刷新用户令牌失败: {e}")
            return None
    
    def delete_user_account(self, user_id):
        """删除用户账户（注意：当前数据库结构不支持软删除）"""
        try:
            # 当前数据库结构不支持软删除字段，直接物理删除
            result = self.supabase.table('users').delete().eq('user_id', user_id).execute()
            return True if result.data else False
            
        except Exception as e:
            print(f"删除用户账户失败: {e}")
            return False
    
    def get_user_stats(self, user_id):
        """获取用户统计信息"""
        try:
            # 获取用户基本信息
            user_result = self.supabase.table('users').select('*').eq('user_id', user_id).execute()
            if not user_result.data:
                return None
            
            user = user_result.data[0]
            
            # 这里可以添加更多统计信息的查询
            # 例如：用户的帖子数量、评论数量等
            
            stats = {
                'user_id': user['user_id'],
                'username': user['github_username'],
                'created_at': user['created_at'],
                'total_posts': 0,  # 待实现
                'total_comments': 0,  # 待实现
                'last_active': user.get('updated_at', user['created_at'])
            }
            
            return stats
            
        except Exception as e:
            print(f"获取用户统计信息失败: {e}")
            return None
    
    def is_user_authenticated(self):
        """检查用户是否已认证"""
        return session.get('is_authenticated', False)
    
    def get_session_user_id(self):
        """获取会话中的用户ID"""
        return session.get('user_id')
    
    def get_session_username(self):
        """获取会话中的用户名"""
        return session.get('username')