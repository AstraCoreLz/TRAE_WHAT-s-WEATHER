-- 修复数据库字段映射问题
-- 解决API代码与数据库表结构字段名不匹配的问题

-- 1. 为emotions表添加content字段（映射原有的text字段）
ALTER TABLE emotions ADD COLUMN IF NOT EXISTS content TEXT;

-- 将现有text字段的数据复制到content字段
UPDATE emotions SET content = text WHERE content IS NULL;

-- 为content字段添加长度约束
ALTER TABLE emotions ADD CONSTRAINT check_content_length CHECK (LENGTH(content) <= 200);

-- 2. 为users表添加username字段（映射原有的github_username字段）
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);

-- 将现有github_username字段的数据复制到username字段
UPDATE users SET username = github_username WHERE username IS NULL;

-- 为username字段添加唯一约束
ALTER TABLE users ADD CONSTRAINT unique_username UNIQUE (username);

-- 3. 为users表添加display_name和avatar_url字段（API中需要这些字段）
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 将github_username作为默认的display_name
UPDATE users SET display_name = github_username WHERE display_name IS NULL;

-- 4. 为emotions表添加缺失的字段
ALTER TABLE emotions ADD COLUMN IF NOT EXISTS privacy_setting VARCHAR(20) DEFAULT 'public';
ALTER TABLE emotions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE emotions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 添加privacy_setting字段的约束
ALTER TABLE emotions ADD CONSTRAINT check_privacy_setting CHECK (privacy_setting IN ('public', 'private'));

-- 5. 为comments表添加is_deleted字段
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 6. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_emotions_content ON emotions(content);
CREATE INDEX IF NOT EXISTS idx_emotions_privacy ON emotions(privacy_setting);
CREATE INDEX IF NOT EXISTS idx_emotions_is_deleted ON emotions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_comments_is_deleted ON comments(is_deleted);

-- 7. 更新权限设置
GRANT SELECT ON users TO anon;
GRANT SELECT ON emotions TO anon;
GRANT SELECT ON comments TO anon;
GRANT SELECT ON likes TO anon;
GRANT SELECT ON collections TO anon;
GRANT SELECT ON comment_likes TO anon;

GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT ALL PRIVILEGES ON emotions TO authenticated;
GRANT ALL PRIVILEGES ON comments TO authenticated;
GRANT ALL PRIVILEGES ON likes TO authenticated;
GRANT ALL PRIVILEGES ON collections TO authenticated;
GRANT ALL PRIVILEGES ON comment_likes TO authenticated;