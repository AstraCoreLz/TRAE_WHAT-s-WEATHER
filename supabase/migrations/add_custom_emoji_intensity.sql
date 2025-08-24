-- 添加自定义emoji和强度字段到emotions表
ALTER TABLE emotions 
ADD COLUMN IF NOT EXISTS custom_emoji TEXT,
ADD COLUMN IF NOT EXISTS intensity INTEGER DEFAULT 5;

-- 添加强度字段的约束（1-10之间）
ALTER TABLE emotions 
ADD CONSTRAINT check_intensity_range CHECK (intensity >= 1 AND intensity <= 10);

-- 为新字段添加注释
COMMENT ON COLUMN emotions.custom_emoji IS '自定义情绪表情符号';
COMMENT ON COLUMN emotions.intensity IS '情绪强度（1-10）';