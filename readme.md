# 情绪分享平台   E - WEATHER

一个基于地理位置的情绪分享社交平台，用户可以在地图上分享自己的情绪状态，与他人进行互动交流。

## 功能特性

### 核心功能
- 🗺️ **地理位置情绪分享** - 在地图上标记并分享当前情绪
- 😊 **多种情绪类型** - 支持开心、难过、愤怒、惊讶、恐惧、厌恶等情绪
- 🔒 **隐私控制** - 可设置情绪为公开或私密
- 📍 **位置服务** - 自动获取或手动选择位置

### 社交功能
- 👍 **点赞系统** - 为他人的情绪分享点赞
- 💬 **评论互动** - 对情绪进行评论和回复
- ⭐ **收藏功能** - 收藏感兴趣的情绪分享
- 📤 **分享功能** - 分享到微博、微信、QQ等社交平台

### 用户功能
- 🔐 **GitHub OAuth登录** - 使用GitHub账号快速登录
- 👤 **个人主页** - 查看个人情绪历史和统计
- 📊 **情绪分析** - 个人情绪趋势分析
- 🎯 **筛选功能** - 按情绪类型和时间筛选

## 技术架构

### 后端技术
- **Flask** - Python Web框架
- **Supabase** - 数据库和认证服务
- **GitHub OAuth** - 第三方登录
- **RESTful API** - 标准化接口设计

### 前端技术
- **HTML5/CSS3/JavaScript** - 原生Web技术
- **Leaflet** - 交互式地图库
- **响应式设计** - 支持多设备访问

### 数据库设计
- `users` - 用户信息表
- `emotions` - 情绪分享表
- `comments` - 评论表
- `likes` - 点赞表
- `collections` - 收藏表
- `comment_likes` - 评论点赞表

## 安装配置

### 环境要求
- Python 3.8+
- pip 包管理器
- Supabase 账号
- GitHub OAuth 应用

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd emotion-share-platform
```

2. **安装依赖**
```bash
pip install -r requirements.txt
```

3. **配置环境变量**

复制 `.env` 文件并填入相应配置：

```env
# Flask配置
FLASK_SECRET_KEY=your-secret-key-here
FLASK_DEBUG=True

# GitHub OAuth配置
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:5000/auth/callback

# Supabase配置
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

4. **初始化数据库**

在Supabase中执行 `supabase/migrations/init_database.sql` 脚本

5. **启动应用**
```bash
python app.py
```

访问 http://localhost:5000 查看应用

## 配置说明

### GitHub OAuth 设置

1. 在GitHub中创建OAuth应用
2. 设置回调URL为：`http://localhost:5000/auth/callback`
3. 获取Client ID和Client Secret

### Supabase 设置

1. 创建Supabase项目
2. 获取项目URL和API密钥
3. 执行数据库迁移脚本
4. 配置行级安全策略(RLS)

## API 接口

### 认证接口
- `GET /auth/login` - GitHub登录
- `GET /auth/callback` - OAuth回调
- `POST /auth/logout` - 用户登出

### 情绪接口
- `GET /api/emotions` - 获取情绪列表
- `POST /api/emotions` - 创建情绪
- `PUT /api/emotions/<id>` - 更新情绪
- `DELETE /api/emotions/<id>` - 删除情绪

### 社交接口
- `POST /api/emotions/<id>/like` - 点赞/取消点赞
- `GET /api/emotions/<id>/comments` - 获取评论
- `POST /api/emotions/<id>/comments` - 添加评论
- `POST /api/emotions/<id>/collect` - 收藏/取消收藏

### 用户接口
- `GET /api/user/profile` - 获取用户资料
- `GET /api/user/stats` - 获取用户统计
- `GET /api/user/emotions` - 获取用户情绪
- `GET /api/user/collections` - 获取用户收藏

## 项目结构

```
emotion-share-platform/
├── app.py                 # Flask主应用
├── auth.py               # 认证模块
├── api.py                # API接口
├── config.py             # 配置文件
├── requirements.txt      # Python依赖
├── .env                  # 环境变量
├── templates/            # HTML模板
│   ├── base.html
│   ├── index.html
│   ├── profile.html
│   └── emotion_detail.html
├── static/               # 静态文件
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── map.js
│   │   ├── emotion.js
│   │   ├── emotion-detail.js
│   │   └── profile.js
│   └── images/
└── supabase/
    └── migrations/
        └── init_database.sql
```

## 使用说明

### 基本使用

1. **注册登录** - 使用GitHub账号登录
2. **分享情绪** - 点击地图上的"分享情绪"按钮
3. **选择情绪** - 选择当前情绪类型
4. **添加描述** - 输入情绪描述(可选)
5. **设置隐私** - 选择公开或私密
6. **确认位置** - 确认或调整位置
7. **发布分享** - 点击发布按钮

### 社交互动

- **查看情绪** - 点击地图上的情绪标记
- **点赞评论** - 在情绪详情页进行互动
- **收藏分享** - 收藏感兴趣的内容
- **个人主页** - 查看个人情绪历史

## 开发指南

### 本地开发

```bash
# 启动开发服务器
python app.py

# 访问应用
open http://localhost:5000
```

### 代码规范

- 遵循PEP 8 Python代码规范
- 使用有意义的变量和函数名
- 添加必要的注释和文档
- 保持代码简洁和可读性

### 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目Issues
- 邮箱联系
- 社交媒体

---

**注意**: 这是一个演示项目，请勿在生产环境中直接使用。使用前请确保已正确配置所有安全设置。