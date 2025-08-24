-- 更新emotion_type字段约束以包含所有前端使用的情绪类型
-- 解决'confused'等新增情绪类型违反约束的问题

-- 1. 删除现有的check约束
ALTER TABLE emotions DROP CONSTRAINT IF EXISTS emotions_emotion_type_check;

-- 2. 添加新的check约束，包含所有前端使用的情绪类型
ALTER TABLE emotions ADD CONSTRAINT emotions_emotion_type_check 
    CHECK (emotion_type IN (
        'happy',      -- 开心
        'sad',        -- 难过  
        'angry',      -- 愤怒
        'excited',    -- 兴奋
        'calm',       -- 平静
        'anxious',    -- 焦虑
        'confused',   -- 困惑
        'grateful',   -- 感激
        'love',       -- 恋爱
        'tired',      -- 疲惫
        'surprised',  -- 惊讶
        'lonely',     -- 孤独
        'custom'      -- 自定义
    ));

-- 3. 验证约束更新成功
-- 约束已成功添加