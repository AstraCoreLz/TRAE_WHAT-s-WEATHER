-- 实时情绪分享与可视化平台数据库初始化脚本
-- 创建所有必需的表结构和权限设置

-- 创建用户表
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_username VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户表索引
CREATE INDEX idx_users_github_username ON users(github_username);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 创建情绪表
CREATE TABLE emotions (
    emotion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    emotion_type VARCHAR(50) NOT NULL CHECK (emotion_type IN ('happy', 'anxious', 'calm', 'sad', 'angry', 'custom')),
    custom_emoji VARCHAR(10),
    text TEXT CHECK (LENGTH(text) <= 200),
    is_public BOOLEAN DEFAULT true,
    allow_collect BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建情绪表索引
CREATE INDEX idx_emotions_user_id ON emotions(user_id);
CREATE INDEX idx_emotions_created_at ON emotions(created_at DESC);
CREATE INDEX idx_emotions_location ON emotions(latitude, longitude);
CREATE INDEX idx_emotions_type ON emotions(emotion_type);
CREATE INDEX idx_emotions_public ON emotions(is_public) WHERE is_public = true;

-- 创建评论表
CREATE TABLE comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emotion_id UUID NOT NULL REFERENCES emotions(emotion_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(comment_id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建评论表索引
CREATE INDEX idx_comments_emotion_id ON comments(emotion_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- 创建点赞表
CREATE TABLE likes (
    like_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emotion_id UUID NOT NULL REFERENCES emotions(emotion_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(emotion_id, user_id)
);

-- 创建点赞表索引
CREATE INDEX idx_likes_emotion_id ON likes(emotion_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

-- 创建收藏表
CREATE TABLE collections (
    collection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emotion_id UUID NOT NULL REFERENCES emotions(emotion_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(emotion_id, user_id)
);

-- 创建收藏表索引
CREATE INDEX idx_collections_emotion_id ON collections(emotion_id);
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_created_at ON collections(created_at DESC);

-- 创建评论点赞表
CREATE TABLE comment_likes (
    comment_like_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(comment_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- 创建评论点赞表索引
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

-- 设置权限 - 允许匿名用户查看公开内容
GRANT SELECT ON users TO anon;
GRANT SELECT ON emotions TO anon;
GRANT SELECT ON comments TO anon;
GRANT SELECT ON likes TO anon;
GRANT SELECT ON collections TO anon;
GRANT SELECT ON comment_likes TO anon;

-- 设置权限 - 允许认证用户完全访问
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT ALL PRIVILEGES ON emotions TO authenticated;
GRANT ALL PRIVILEGES ON comments TO authenticated;
GRANT ALL PRIVILEGES ON likes TO authenticated;
GRANT ALL PRIVILEGES ON collections TO authenticated;
GRANT ALL PRIVILEGES ON comment_likes TO authenticated;

-- 插入示例数据
INSERT INTO emotions (user_id, latitude, longitude, emotion_type, text) VALUES
(NULL, 39.9042, 116.4074, 'happy', '北京的天气真不错！'),
(NULL, 31.2304, 121.4737, 'calm', '上海的夜景很美'),
(NULL, 22.3193, 114.1694, 'anxious', '工作压力有点大'),
(NULL, 39.0458, 117.7759, 'sad', '想家了'),
(NULL, 30.5728, 104.0668, 'angry', '交通太堵了！');