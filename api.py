# Flask API路由和业务逻辑
from flask import Blueprint, request, jsonify, session
from datetime import datetime, timedelta
import json
from supabase import create_client, Client
from config import Config
from auth import GitHubAuth

# 创建API蓝图
api_bp = Blueprint('api', __name__, url_prefix='/api')

# 初始化Supabase客户端
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)

# 情绪类型映射
EMOTION_TYPES = {
    'happy': '开心',
    'sad': '难过',
    'angry': '愤怒',
    'excited': '兴奋',
    'anxious': '焦虑',
    'peaceful': '平静',
    'confused': '困惑',
    'grateful': '感激',
    'lonely': '孤独',
    'hopeful': '希望',
    'frustrated': '沮丧',
    'content': '满足',
    'custom': '自定义'
}

def require_auth(f):
    """装饰器：要求用户登录"""
    def decorated_function(*args, **kwargs):
        if not session.get('is_authenticated'):
            return jsonify({'error': '需要登录'}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def get_current_user_id():
    """获取当前用户ID"""
    return session.get('user_id')

# ==================== 情绪相关API ====================

@api_bp.route('/emotions', methods=['GET'])
def get_emotions():
    """获取情绪列表"""
    try:
        # 获取查询参数
        emotion_type = request.args.get('type')
        time_filter = request.args.get('time_filter', 'all')
        privacy = request.args.get('privacy', 'public')
        user_id = request.args.get('user_id')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        # 构建查询
        query = supabase.table('emotions').select(
            'id, user_id, emotion_type, content, custom_emoji, intensity, latitude, longitude, '
            'privacy_setting, created_at, updated_at, '
            'users(username, display_name, avatar_url)'
        )
        
        # 过滤已删除的情绪
        query = query.eq('is_deleted', False)
        
        # 情绪类型过滤
        if emotion_type and emotion_type != 'all':
            query = query.eq('emotion_type', emotion_type)
        
        # 隐私设置过滤
        if privacy == 'public':
            query = query.eq('privacy_setting', 'public')
        elif privacy == 'private':
            current_user_id = get_current_user_id()
            if not current_user_id:
                return jsonify({'error': '需要登录查看私密情绪'}), 401
            query = query.eq('user_id', current_user_id)
        
        # 用户过滤
        if user_id:
            query = query.eq('user_id', user_id)
        
        # 时间过滤
        if time_filter != 'all':
            now = datetime.utcnow()
            if time_filter == 'today':
                start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif time_filter == 'week':
                start_time = now - timedelta(days=7)
            elif time_filter == 'month':
                start_time = now - timedelta(days=30)
            else:
                start_time = None
            
            if start_time:
                query = query.gte('created_at', start_time.isoformat())
        
        # 分页
        offset = (page - 1) * limit
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        
        # 处理结果
        emotions = []
        for emotion in result.data:
            emotion_data = {
                'id': emotion['id'],
                'user_id': emotion['user_id'],
                'emotion_type': emotion['emotion_type'],
                'content': emotion['content'],
                'custom_emoji': emotion.get('custom_emoji'),
                'intensity': emotion.get('intensity', 5),
                'latitude': emotion['latitude'],
                'longitude': emotion['longitude'],
                'privacy_setting': emotion['privacy_setting'],
                'created_at': emotion['created_at'],
                'updated_at': emotion['updated_at'],
                'user': emotion['users']
            }
            emotions.append(emotion_data)
        
        return jsonify({
            'emotions': emotions,
            'page': page,
            'limit': limit,
            'total': len(emotions)
        })
        
    except Exception as e:
        print(f"获取情绪列表失败: {e}")
        return jsonify({'error': '获取情绪列表失败'}), 500

@api_bp.route('/emotions', methods=['POST'])
@require_auth
def create_emotion():
    """创建新情绪"""
    try:
        data = request.get_json()
        
        # 验证必需字段
        required_fields = ['emotion_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'缺少必需字段: {field}'}), 400
        
        # 验证情绪类型
        if data['emotion_type'] not in EMOTION_TYPES:
            return jsonify({'error': '无效的情绪类型'}), 400
        
        # 如果是自定义类型，验证custom_emoji字段
        if data['emotion_type'] == 'custom':
            if not data.get('custom_emoji'):
                return jsonify({'error': '自定义情绪类型需要提供custom_emoji'}), 400
        
        # 验证描述内容（可选）
        content = data.get('description', '').strip()
        if content and len(content) > Config.MAX_EMOTION_LENGTH:
            return jsonify({'error': f'情绪描述不能超过{Config.MAX_EMOTION_LENGTH}个字符'}), 400
        
        # 准备数据
        emotion_data = {
            'user_id': get_current_user_id(),
            'emotion_type': data['emotion_type'],
            'content': content or '',
            'intensity': data.get('intensity', 5),
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
            'privacy_setting': data.get('privacy_setting', 'public'),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # 如果是自定义类型，添加custom_emoji字段
        if data['emotion_type'] == 'custom':
            emotion_data['custom_emoji'] = data['custom_emoji']
        
        # 插入数据库
        result = supabase.table('emotions').insert(emotion_data).execute()
        
        if result.data:
            return jsonify({
                'message': '情绪创建成功',
                'emotion': result.data[0]
            }), 201
        else:
            return jsonify({'error': '创建情绪失败'}), 500
            
    except Exception as e:
        print(f"创建情绪失败: {e}")
        return jsonify({'error': '创建情绪失败'}), 500

@api_bp.route('/emotions/<int:emotion_id>', methods=['GET'])
def get_emotion_detail(emotion_id):
    """获取情绪详情"""
    try:
        # 获取情绪详情
        result = supabase.table('emotions').select(
            'id, user_id, emotion_type, content, custom_emoji, intensity, latitude, longitude, '
            'privacy_setting, created_at, updated_at, '
            'users(username, display_name, avatar_url)'
        ).eq('id', emotion_id).eq('is_deleted', False).execute()
        
        if not result.data:
            return jsonify({'error': '情绪不存在'}), 404
        
        emotion = result.data[0]
        
        # 检查隐私权限
        if emotion['privacy_setting'] == 'private':
            current_user_id = get_current_user_id()
            if not current_user_id or current_user_id != emotion['user_id']:
                return jsonify({'error': '无权查看此情绪'}), 403
        
        # 获取社交统计
        likes_count = supabase.table('likes').select('id', count='exact').eq('emotion_id', emotion_id).execute().count or 0
        collections_count = supabase.table('collections').select('id', count='exact').eq('emotion_id', emotion_id).execute().count or 0
        comments_count = supabase.table('comments').select('id', count='exact').eq('emotion_id', emotion_id).eq('is_deleted', False).execute().count or 0
        
        # 检查当前用户是否已点赞/收藏
        current_user_id = get_current_user_id()
        is_liked = False
        is_collected = False
        
        if current_user_id:
            like_result = supabase.table('likes').select('id').eq('emotion_id', emotion_id).eq('user_id', current_user_id).execute()
            is_liked = bool(like_result.data)
            
            collection_result = supabase.table('collections').select('id').eq('emotion_id', emotion_id).eq('user_id', current_user_id).execute()
            is_collected = bool(collection_result.data)
        
        emotion_data = {
            'id': emotion['id'],
            'user_id': emotion['user_id'],
            'emotion_type': emotion['emotion_type'],
            'content': emotion['content'],
            'custom_emoji': emotion.get('custom_emoji'),
            'intensity': emotion.get('intensity', 5),
            'latitude': emotion['latitude'],
            'longitude': emotion['longitude'],
            'privacy_setting': emotion['privacy_setting'],
            'created_at': emotion['created_at'],
            'updated_at': emotion['updated_at'],
            'user': emotion['users'],
            'stats': {
                'likes_count': likes_count,
                'collections_count': collections_count,
                'comments_count': comments_count,
                'is_liked': is_liked,
                'is_collected': is_collected
            }
        }
        
        return jsonify({'emotion': emotion_data})
        
    except Exception as e:
        print(f"获取情绪详情失败: {e}")
        return jsonify({'error': '获取情绪详情失败'}), 500

@api_bp.route('/emotions/<int:emotion_id>', methods=['PUT'])
@require_auth
def update_emotion(emotion_id):
    """更新情绪"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # 检查情绪是否存在且属于当前用户
        emotion_result = supabase.table('emotions').select('user_id').eq('id', emotion_id).eq('is_deleted', False).execute()
        
        if not emotion_result.data:
            return jsonify({'error': '情绪不存在'}), 404
        
        if emotion_result.data[0]['user_id'] != current_user_id:
            return jsonify({'error': '无权修改此情绪'}), 403
        
        # 准备更新数据
        update_data = {'updated_at': datetime.utcnow().isoformat()}
        
        # 允许更新的字段
        allowed_fields = ['content', 'privacy_setting']
        for field in allowed_fields:
            if field in data:
                if field == 'content' and len(data[field]) > Config.MAX_EMOTION_LENGTH:
                    return jsonify({'error': f'情绪内容不能超过{Config.MAX_EMOTION_LENGTH}个字符'}), 400
                update_data[field] = data[field]
        
        if len(update_data) == 1:  # 只有updated_at
            return jsonify({'error': '没有可更新的字段'}), 400
        
        # 更新数据库
        result = supabase.table('emotions').update(update_data).eq('id', emotion_id).execute()
        
        if result.data:
            return jsonify({
                'message': '情绪更新成功',
                'emotion': result.data[0]
            })
        else:
            return jsonify({'error': '更新情绪失败'}), 500
            
    except Exception as e:
        print(f"更新情绪失败: {e}")
        return jsonify({'error': '更新情绪失败'}), 500

@api_bp.route('/emotions/<int:emotion_id>', methods=['DELETE'])
@require_auth
def delete_emotion(emotion_id):
    """删除情绪（软删除）"""
    try:
        current_user_id = get_current_user_id()
        
        # 检查情绪是否存在且属于当前用户
        emotion_result = supabase.table('emotions').select('user_id').eq('id', emotion_id).eq('is_deleted', False).execute()
        
        if not emotion_result.data:
            return jsonify({'error': '情绪不存在'}), 404
        
        if emotion_result.data[0]['user_id'] != current_user_id:
            return jsonify({'error': '无权删除此情绪'}), 403
        
        # 软删除
        update_data = {
            'is_deleted': True,
            'deleted_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        result = supabase.table('emotions').update(update_data).eq('id', emotion_id).execute()
        
        if result.data:
            return jsonify({'message': '情绪删除成功'})
        else:
            return jsonify({'error': '删除情绪失败'}), 500
            
    except Exception as e:
        print(f"删除情绪失败: {e}")
        return jsonify({'error': '删除情绪失败'}), 500

# ==================== 点赞相关API ====================

@api_bp.route('/emotions/<int:emotion_id>/like', methods=['POST'])
@require_auth
def toggle_like(emotion_id):
    """切换点赞状态"""
    try:
        current_user_id = get_current_user_id()
        
        # 检查情绪是否存在
        emotion_result = supabase.table('emotions').select('id, privacy_setting, user_id').eq('id', emotion_id).eq('is_deleted', False).execute()
        
        if not emotion_result.data:
            return jsonify({'error': '情绪不存在'}), 404
        
        emotion = emotion_result.data[0]
        
        # 检查隐私权限
        if emotion['privacy_setting'] == 'private' and emotion['user_id'] != current_user_id:
            return jsonify({'error': '无权对此情绪点赞'}), 403
        
        # 检查是否已点赞
        like_result = supabase.table('likes').select('id').eq('emotion_id', emotion_id).eq('user_id', current_user_id).execute()
        
        if like_result.data:
            # 取消点赞
            supabase.table('likes').delete().eq('emotion_id', emotion_id).eq('user_id', current_user_id).execute()
            action = 'unliked'
        else:
            # 添加点赞
            like_data = {
                'emotion_id': emotion_id,
                'user_id': current_user_id,
                'created_at': datetime.utcnow().isoformat()
            }
            supabase.table('likes').insert(like_data).execute()
            action = 'liked'
        
        # 获取最新点赞数
        likes_count = supabase.table('likes').select('id', count='exact').eq('emotion_id', emotion_id).execute().count or 0
        
        return jsonify({
            'message': f'点赞状态已更新',
            'action': action,
            'likes_count': likes_count
        })
        
    except Exception as e:
        print(f"切换点赞状态失败: {e}")
        return jsonify({'error': '操作失败'}), 500

# ==================== 收藏相关API ====================

@api_bp.route('/emotions/<int:emotion_id>/collect', methods=['POST'])
@require_auth
def toggle_collection(emotion_id):
    """切换收藏状态"""
    try:
        current_user_id = get_current_user_id()
        
        # 检查情绪是否存在
        emotion_result = supabase.table('emotions').select('id, privacy_setting, user_id').eq('id', emotion_id).eq('is_deleted', False).execute()
        
        if not emotion_result.data:
            return jsonify({'error': '情绪不存在'}), 404
        
        emotion = emotion_result.data[0]
        
        # 检查隐私权限
        if emotion['privacy_setting'] == 'private' and emotion['user_id'] != current_user_id:
            return jsonify({'error': '无权收藏此情绪'}), 403
        
        # 检查是否已收藏
        collection_result = supabase.table('collections').select('id').eq('emotion_id', emotion_id).eq('user_id', current_user_id).execute()
        
        if collection_result.data:
            # 取消收藏
            supabase.table('collections').delete().eq('emotion_id', emotion_id).eq('user_id', current_user_id).execute()
            action = 'uncollected'
        else:
            # 添加收藏
            collection_data = {
                'emotion_id': emotion_id,
                'user_id': current_user_id,
                'created_at': datetime.utcnow().isoformat()
            }
            supabase.table('collections').insert(collection_data).execute()
            action = 'collected'
        
        # 获取最新收藏数
        collections_count = supabase.table('collections').select('id', count='exact').eq('emotion_id', emotion_id).execute().count or 0
        
        return jsonify({
            'message': f'收藏状态已更新',
            'action': action,
            'collections_count': collections_count
        })
        
    except Exception as e:
        print(f"切换收藏状态失败: {e}")
        return jsonify({'error': '操作失败'}), 500

@api_bp.route('/user/collections', methods=['GET'])
@require_auth
def get_user_collections():
    """获取用户收藏列表"""
    try:
        current_user_id = get_current_user_id()
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        # 分页
        offset = (page - 1) * limit
        
        # 获取收藏的情绪
        result = supabase.table('collections').select(
            'id, created_at, '
            'emotions(id, user_id, emotion_type, content, latitude, longitude, '
            'privacy_setting, created_at, updated_at, '
            'users(username, display_name, avatar_url))'
        ).eq('user_id', current_user_id).order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        collections = []
        for collection in result.data:
            if collection['emotions'] and not collection['emotions'].get('is_deleted', False):
                collection_data = {
                    'collection_id': collection['id'],
                    'collected_at': collection['created_at'],
                    'emotion': collection['emotions']
                }
                collections.append(collection_data)
        
        return jsonify({
            'collections': collections,
            'page': page,
            'limit': limit,
            'total': len(collections)
        })
        
    except Exception as e:
        print(f"获取收藏列表失败: {e}")
        return jsonify({'error': '获取收藏列表失败'}), 500

# ==================== 评论相关API ====================

@api_bp.route('/emotions/<int:emotion_id>/comments', methods=['GET'])
def get_comments(emotion_id):
    """获取情绪评论列表"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        # 检查情绪是否存在和权限
        emotion_result = supabase.table('emotions').select('id, privacy_setting, user_id').eq('id', emotion_id).eq('is_deleted', False).execute()
        
        if not emotion_result.data:
            return jsonify({'error': '情绪不存在'}), 404
        
        emotion = emotion_result.data[0]
        
        # 检查隐私权限
        if emotion['privacy_setting'] == 'private':
            current_user_id = get_current_user_id()
            if not current_user_id or current_user_id != emotion['user_id']:
                return jsonify({'error': '无权查看此情绪的评论'}), 403
        
        # 分页
        offset = (page - 1) * limit
        
        # 获取评论
        result = supabase.table('comments').select(
            'id, user_id, content, created_at, updated_at, '
            'users(username, display_name, avatar_url)'
        ).eq('emotion_id', emotion_id).eq('is_deleted', False).order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        comments = []
        current_user_id = get_current_user_id()
        
        for comment in result.data:
            # 获取评论点赞数和当前用户是否已点赞
            likes_count = supabase.table('comment_likes').select('id', count='exact').eq('comment_id', comment['id']).execute().count or 0
            is_liked = False
            
            if current_user_id:
                like_result = supabase.table('comment_likes').select('id').eq('comment_id', comment['id']).eq('user_id', current_user_id).execute()
                is_liked = bool(like_result.data)
            
            comment_data = {
                'id': comment['id'],
                'user_id': comment['user_id'],
                'content': comment['content'],
                'created_at': comment['created_at'],
                'updated_at': comment['updated_at'],
                'user': comment['users'],
                'likes_count': likes_count,
                'is_liked': is_liked
            }
            comments.append(comment_data)
        
        return jsonify({
            'comments': comments,
            'page': page,
            'limit': limit,
            'total': len(comments)
        })
        
    except Exception as e:
        print(f"获取评论列表失败: {e}")
        return jsonify({'error': '获取评论列表失败'}), 500

@api_bp.route('/emotions/<int:emotion_id>/comments', methods=['POST'])
@require_auth
def create_comment(emotion_id):
    """创建评论"""
    try:
        data = request.get_json()
        current_user_id = get_current_user_id()
        
        # 验证内容
        content = data.get('content', '').strip()
        if not content:
            return jsonify({'error': '评论内容不能为空'}), 400
        
        if len(content) > Config.MAX_COMMENT_LENGTH:
            return jsonify({'error': f'评论内容不能超过{Config.MAX_COMMENT_LENGTH}个字符'}), 400
        
        # 检查情绪是否存在和权限
        emotion_result = supabase.table('emotions').select('id, privacy_setting, user_id').eq('id', emotion_id).eq('is_deleted', False).execute()
        
        if not emotion_result.data:
            return jsonify({'error': '情绪不存在'}), 404
        
        emotion = emotion_result.data[0]
        
        # 检查隐私权限
        if emotion['privacy_setting'] == 'private' and emotion['user_id'] != current_user_id:
            return jsonify({'error': '无权评论此情绪'}), 403
        
        # 创建评论
        comment_data = {
            'emotion_id': emotion_id,
            'user_id': current_user_id,
            'content': content,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        result = supabase.table('comments').insert(comment_data).execute()
        
        if result.data:
            # 获取完整的评论信息
            comment_id = result.data[0]['id']
            comment_result = supabase.table('comments').select(
                'id, user_id, content, created_at, updated_at, '
                'users(username, display_name, avatar_url)'
            ).eq('id', comment_id).execute()
            
            if comment_result.data:
                comment = comment_result.data[0]
                comment['likes_count'] = 0
                comment['is_liked'] = False
                
                return jsonify({
                    'message': '评论创建成功',
                    'comment': comment
                }), 201
        
        return jsonify({'error': '创建评论失败'}), 500
        
    except Exception as e:
        print(f"创建评论失败: {e}")
        return jsonify({'error': '创建评论失败'}), 500

@api_bp.route('/comments/<int:comment_id>/like', methods=['POST'])
@require_auth
def toggle_comment_like(comment_id):
    """切换评论点赞状态"""
    try:
        current_user_id = get_current_user_id()
        
        # 检查评论是否存在
        comment_result = supabase.table('comments').select('id').eq('id', comment_id).eq('is_deleted', False).execute()
        
        if not comment_result.data:
            return jsonify({'error': '评论不存在'}), 404
        
        # 检查是否已点赞
        like_result = supabase.table('comment_likes').select('id').eq('comment_id', comment_id).eq('user_id', current_user_id).execute()
        
        if like_result.data:
            # 取消点赞
            supabase.table('comment_likes').delete().eq('comment_id', comment_id).eq('user_id', current_user_id).execute()
            action = 'unliked'
        else:
            # 添加点赞
            like_data = {
                'comment_id': comment_id,
                'user_id': current_user_id,
                'created_at': datetime.utcnow().isoformat()
            }
            supabase.table('comment_likes').insert(like_data).execute()
            action = 'liked'
        
        # 获取最新点赞数
        likes_count = supabase.table('comment_likes').select('id', count='exact').eq('comment_id', comment_id).execute().count or 0
        
        return jsonify({
            'message': f'评论点赞状态已更新',
            'action': action,
            'likes_count': likes_count
        })
        
    except Exception as e:
        print(f"切换评论点赞状态失败: {e}")
        return jsonify({'error': '操作失败'}), 500

# ==================== 用户统计API ====================

@api_bp.route('/user/stats', methods=['GET'])
@require_auth
def get_user_stats():
    """获取用户统计信息"""
    try:
        current_user_id = get_current_user_id()
        
        # 获取情绪数量
        emotions_result = supabase.table('emotions').select('id', count='exact').eq('user_id', current_user_id).eq('is_deleted', False).execute()
        emotions_count = emotions_result.count or 0
        
        # 获取总点赞数（用户发布的情绪获得的点赞）
        user_emotions = supabase.table('emotions').select('id').eq('user_id', current_user_id).eq('is_deleted', False).execute()
        emotion_ids = [emotion['id'] for emotion in user_emotions.data] if user_emotions.data else []
        
        total_likes = 0
        total_collections = 0
        
        if emotion_ids:
            # 获取总点赞数
            for emotion_id in emotion_ids:
                likes_result = supabase.table('likes').select('id', count='exact').eq('emotion_id', emotion_id).execute()
                total_likes += likes_result.count or 0
            
            # 获取总收藏数
            for emotion_id in emotion_ids:
                collections_result = supabase.table('collections').select('id', count='exact').eq('emotion_id', emotion_id).execute()
                total_collections += collections_result.count or 0
        
        return jsonify({
            'stats': {
                'emotions_count': emotions_count,
                'total_likes': total_likes,
                'total_collections': total_collections
            }
        })
        
    except Exception as e:
        print(f"获取用户统计失败: {e}")
        return jsonify({'error': '获取统计信息失败'}), 500

# ==================== 情绪类型API ====================

@api_bp.route('/emotion-types', methods=['GET'])
def get_emotion_types():
    """获取所有情绪类型"""
    return jsonify({'emotion_types': EMOTION_TYPES})