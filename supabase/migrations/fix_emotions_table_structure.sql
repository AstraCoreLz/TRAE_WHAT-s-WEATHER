-- 修复emotions表结构问题
-- 解决API代码中使用id字段但数据库中是emotion_id的问题
-- 添加缺少的updated_at字段

-- 1. 添加id列作为emotion_id的别名（通过视图或者重命名列）
-- 由于emotion_id已经是主键，我们需要重命名列
ALTER TABLE emotions RENAME COLUMN emotion_id TO id;

-- 2. 添加updated_at字段
ALTER TABLE emotions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. 为现有记录设置updated_at值（与created_at相同）
UPDATE emotions SET updated_at = created_at WHERE updated_at IS NULL;

-- 4. 创建触发器自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. 为emotions表创建更新触发器
DROP TRIGGER IF EXISTS update_emotions_updated_at ON emotions;
CREATE TRIGGER update_emotions_updated_at
    BEFORE UPDATE ON emotions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 更新外键约束以使用新的列名
-- 删除旧的外键约束
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_emotion_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_emotion_id_fkey;
ALTER TABLE collections DROP CONSTRAINT IF EXISTS collections_emotion_id_fkey;

-- 重新创建外键约束
ALTER TABLE comments ADD CONSTRAINT comments_emotion_id_fkey 
    FOREIGN KEY (emotion_id) REFERENCES emotions(id);
ALTER TABLE likes ADD CONSTRAINT likes_emotion_id_fkey 
    FOREIGN KEY (emotion_id) REFERENCES emotions(id);
ALTER TABLE collections ADD CONSTRAINT collections_emotion_id_fkey 
    FOREIGN KEY (emotion_id) REFERENCES emotions(id);