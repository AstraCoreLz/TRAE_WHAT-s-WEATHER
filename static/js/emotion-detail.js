// 情绪详情页面功能
class EmotionDetail {
    constructor(emotionId) {
        this.emotionId = emotionId;
        this.isLiked = false;
        this.isCollected = false;
        this.likesCount = 0;
        this.collectionsCount = 0;
        this.commentsCount = 0;
        this.init();
    }

    // 初始化
    init() {
        this.loadEmotionData();
        this.bindEvents();
        this.loadComments();
    }

    // 绑定事件
    bindEvents() {
        // 点赞按钮
        const likeBtn = document.getElementById('likeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => this.toggleLike());
        }

        // 收藏按钮
        const collectBtn = document.getElementById('collectBtn');
        if (collectBtn) {
            collectBtn.addEventListener('click', () => this.toggleCollection());
        }

        // 分享按钮
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.openShareModal());
        }

        // 举报按钮
        const reportBtn = document.getElementById('reportBtn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => this.openReportModal());
        }

        // 评论提交
        const commentForm = document.getElementById('commentForm');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => this.submitComment(e));
        }

        // 评论字符计数
        const commentInput = document.getElementById('commentText');
        if (commentInput) {
            commentInput.addEventListener('input', () => this.updateCommentCharCount());
        }

        // 评论点赞
        document.addEventListener('click', (e) => {
            if (e.target.closest('.comment-like-btn')) {
                const commentId = e.target.closest('.comment-like-btn').dataset.commentId;
                this.toggleCommentLike(commentId);
            }
        });

        // 分享选项
        document.addEventListener('click', (e) => {
            if (e.target.closest('.share-option')) {
                const shareType = e.target.closest('.share-option').dataset.shareType;
                this.handleShare(shareType);
            }
        });

        // 复制链接
        const copyLinkBtn = document.getElementById('copyLinkBtn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => this.copyLink());
        }

        // 模态框关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('close')) {
                this.closeModal(e.target.closest('.modal'));
            }
        });
    }

    // 加载情绪数据
    async loadEmotionData() {
        try {
            const response = await fetch(`/api/emotions/${this.emotionId}`);
            if (response.ok) {
                const data = await response.json();
                this.updateEmotionData(data.emotion);
                this.updateSocialStats(data.emotion);
            } else {
                this.showMessage('加载情绪数据失败', 'error');
            }
        } catch (error) {
            console.error('加载情绪数据出错:', error);
            this.showMessage('网络错误', 'error');
        }
    }

    // 更新情绪数据显示
    updateEmotionData(emotion) {
        const container = document.getElementById('emotionDetailCard');
        if (!container) return;
        
        // 动态创建情绪详情卡片
        container.innerHTML = `
            <div class="emotion-header">
                <div class="emotion-emoji-large">${this.getEmotionEmoji(emotion.emotion_type, emotion.custom_emoji)}</div>
                <div class="emotion-info">
                    <h1 class="emotion-type">${this.getEmotionName(emotion.emotion_type)}</h1>
                    <div class="emotion-meta">
                        <span class="emotion-time">📅 ${this.formatTime(emotion.created_at)}</span>
                        ${emotion.intensity ? `<span class="emotion-intensity">💪 强度: ${emotion.intensity}/10</span>` : ''}
                        <span class="emotion-location">📍 ${emotion.latitude.toFixed(4)}, ${emotion.longitude.toFixed(4)}</span>
                    </div>
                </div>
            </div>
            <div class="emotion-content">
                <div class="emotion-text">${emotion.emotion_text || '没有文字描述'}</div>
                <div class="emotion-author">
                    <img src="${emotion.avatar_url || '/static/images/default-avatar.png'}" alt="头像" class="avatar">
                    <span class="username">${emotion.username}</span>
                </div>
            </div>
        `;
    }

    // 更新社交统计
    updateSocialStats(emotion) {
        this.isLiked = emotion.is_liked || false;
        this.isCollected = emotion.is_collected || false;
        this.likesCount = emotion.likes_count || 0;
        this.collectionsCount = emotion.collections_count || 0;
        this.commentsCount = emotion.comments_count || 0;

        // 更新按钮状态
        this.updateSocialButtons();
    }

    // 更新社交按钮状态
    updateSocialButtons() {
        const likeBtn = document.getElementById('likeBtn');
        const collectBtn = document.getElementById('collectBtn');
        const likesCountEl = document.getElementById('likesCount');
        const collectionsCountEl = document.getElementById('collectionsCount');
        const commentsCountEl = document.getElementById('commentsCount');

        if (likeBtn) {
            likeBtn.classList.toggle('active', this.isLiked);
            likeBtn.querySelector('.icon').textContent = this.isLiked ? '❤️' : '🤍';
        }

        if (collectBtn) {
            collectBtn.classList.toggle('active', this.isCollected);
            collectBtn.querySelector('.icon').textContent = this.isCollected ? '⭐' : '☆';
        }

        if (likesCountEl) likesCountEl.textContent = this.likesCount;
        if (collectionsCountEl) collectionsCountEl.textContent = this.collectionsCount;
        if (commentsCountEl) commentsCountEl.textContent = this.commentsCount;
    }

    // 切换点赞状态
    async toggleLike() {
        try {
            const method = this.isLiked ? 'DELETE' : 'POST';
            const response = await fetch(`/api/emotions/${this.emotionId}/like`, {
                method: method
            });

            if (response.ok) {
                this.isLiked = !this.isLiked;
                this.likesCount += this.isLiked ? 1 : -1;
                this.updateSocialButtons();
            } else {
                const result = await response.json();
                this.showMessage(result.message || '操作失败', 'error');
            }
        } catch (error) {
            console.error('点赞操作失败:', error);
            this.showMessage('网络错误', 'error');
        }
    }

    // 切换收藏状态
    async toggleCollection() {
        try {
            const method = this.isCollected ? 'DELETE' : 'POST';
            const response = await fetch(`/api/emotions/${this.emotionId}/collect`, {
                method: method
            });

            if (response.ok) {
                this.isCollected = !this.isCollected;
                this.collectionsCount += this.isCollected ? 1 : -1;
                this.updateSocialButtons();
                
                const message = this.isCollected ? '已添加到收藏' : '已取消收藏';
                this.showMessage(message, 'success');
            } else {
                const result = await response.json();
                this.showMessage(result.message || '操作失败', 'error');
            }
        } catch (error) {
            console.error('收藏操作失败:', error);
            this.showMessage('网络错误', 'error');
        }
    }

    // 打开分享模态框
    openShareModal() {
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // 更新分享链接
            const shareUrl = `${window.location.origin}/emotion/${this.emotionId}`;
            const shareUrlInput = document.getElementById('shareUrl');
            if (shareUrlInput) {
                shareUrlInput.value = shareUrl;
            }
        }
    }

    // 打开举报模态框
    openReportModal() {
        const modal = document.getElementById('reportModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    // 关闭模态框
    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // 处理分享
    handleShare(shareType) {
        const shareUrl = `${window.location.origin}/emotion/${this.emotionId}`;
        const shareText = '看看这个有趣的情绪分享！';

        switch (shareType) {
            case 'weibo':
                const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
                window.open(weiboUrl, '_blank');
                break;
            case 'wechat':
                // 微信分享需要特殊处理，这里显示二维码或提示
                this.showMessage('请复制链接手动分享到微信', 'info');
                this.copyLink();
                break;
            case 'qq':
                const qqUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
                window.open(qqUrl, '_blank');
                break;
            default:
                this.copyLink();
        }
    }

    // 复制链接
    copyLink() {
        const shareUrl = `${window.location.origin}/emotion/${this.emotionId}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showMessage('链接已复制到剪贴板', 'success');
            }).catch(() => {
                this.fallbackCopyLink(shareUrl);
            });
        } else {
            this.fallbackCopyLink(shareUrl);
        }
    }

    // 备用复制方法
    fallbackCopyLink(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showMessage('链接已复制到剪贴板', 'success');
        } catch (err) {
            this.showMessage('复制失败，请手动复制', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    // 加载评论
    async loadComments() {
        try {
            const response = await fetch(`/api/emotions/${this.emotionId}/comments`);
            if (response.ok) {
                const data = await response.json();
                this.displayComments(data.comments);
            }
        } catch (error) {
            console.error('加载评论失败:', error);
        }
    }

    // 显示评论
    displayComments(comments) {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;

        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments">还没有评论，来说点什么吧~</p>';
            return;
        }

        commentsList.innerHTML = comments.map(comment => `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <img src="${comment.user_avatar || '/static/images/default-avatar.png'}" alt="${comment.username}" class="avatar-small">
                    <div class="comment-info">
                        <span class="comment-author">${comment.username}</span>
                        <span class="comment-time">${this.formatTime(comment.created_at)}</span>
                    </div>
                </div>
                <div class="comment-text">${this.escapeHtml(comment.comment_text)}</div>
                <div class="comment-actions-bar">
                    <span class="comment-action comment-like-btn ${comment.is_liked ? 'active' : ''}" data-comment-id="${comment.id}">
                        ${comment.is_liked ? '❤️' : '🤍'} ${comment.likes_count || 0}
                    </span>
                    <span class="comment-action">回复</span>
                </div>
            </div>
        `).join('');
    }

    // 提交评论
    async submitComment(event) {
        event.preventDefault();
        
        const commentInput = document.getElementById('commentText');
        const commentText = commentInput.value.trim();
        
        if (!commentText) {
            this.showMessage('请输入评论内容', 'error');
            return;
        }
        
        const submitBtn = document.querySelector('#commentForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '发布中...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`/api/emotions/${this.emotionId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    comment_text: commentText
                })
            });
            
            if (response.ok) {
                commentInput.value = '';
                this.updateCommentCharCount();
                this.loadComments();
                this.commentsCount++;
                this.updateSocialButtons();
                this.showMessage('评论发布成功', 'success');
            } else {
                const result = await response.json();
                this.showMessage(result.message || '评论发布失败', 'error');
            }
        } catch (error) {
            console.error('评论提交失败:', error);
            this.showMessage('网络错误', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // 切换评论点赞
    async toggleCommentLike(commentId) {
        try {
            const commentLikeBtn = document.querySelector(`[data-comment-id="${commentId}"]`);
            const isLiked = commentLikeBtn.classList.contains('active');
            
            const method = isLiked ? 'DELETE' : 'POST';
            const response = await fetch(`/api/comments/${commentId}/like`, {
                method: method
            });
            
            if (response.ok) {
                // 重新加载评论以更新状态
                this.loadComments();
            } else {
                const result = await response.json();
                this.showMessage(result.message || '操作失败', 'error');
            }
        } catch (error) {
            console.error('评论点赞失败:', error);
            this.showMessage('网络错误', 'error');
        }
    }

    // 更新评论字符计数
    updateCommentCharCount() {
        const commentInput = document.getElementById('commentText');
        const charCount = document.getElementById('commentCharCount');
        
        if (commentInput && charCount) {
            const currentLength = commentInput.value.length;
            const maxLength = commentInput.getAttribute('maxlength') || 200;
            charCount.textContent = `${currentLength}/${maxLength}`;
            
            if (currentLength > maxLength * 0.9) {
                charCount.style.color = '#dc3545';
            } else if (currentLength > maxLength * 0.7) {
                charCount.style.color = '#ffc107';
            } else {
                charCount.style.color = '#6c757d';
            }
        }
    }

    // 获取情绪表情
    getEmotionEmoji(emotionType, customEmoji = null) {
        if (emotionType === 'custom' && customEmoji) {
            return customEmoji;
        }
        
        const emojis = {
            'happy': '😊',
            'sad': '😢',
            'angry': '😠',
            'excited': '🤩',
            'calm': '😌',
            'anxious': '😰',
            'love': '😍',
            'tired': '😴',
            'surprised': '😲',
            'confused': '😕',
            'grateful': '🙏',
            'lonely': '😔',
            'custom': '🎭'
        };
        return emojis[emotionType] || '😐';
    }

    // 获取情绪名称
    getEmotionName(emotionType) {
        const names = {
            'happy': '开心',
            'sad': '难过',
            'angry': '愤怒',
            'excited': '兴奋',
            'calm': '平静',
            'anxious': '焦虑',
            'love': '恋爱',
            'tired': '疲惫',
            'surprised': '惊讶',
            'confused': '困惑',
            'grateful': '感恩',
            'lonely': '孤独',
            'custom': '自定义'
        };
        return names[emotionType] || '其他';
    }

    // 格式化时间
    formatTime(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
            return '刚刚';
        } else if (diffMins < 60) {
            return `${diffMins}分钟前`;
        } else if (diffHours < 24) {
            return `${diffHours}小时前`;
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示消息
    showMessage(message, type = 'info') {
        const existingMessage = document.querySelector('.message-toast');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = `message-toast ${type}`;
        messageEl.textContent = message;
        
        messageEl.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 3000;
            animation: slideIn 0.3s ease-out;
        `;
        
        switch (type) {
            case 'success':
                messageEl.style.background = '#28a745';
                break;
            case 'error':
                messageEl.style.background = '#dc3545';
                break;
            case 'warning':
                messageEl.style.background = '#ffc107';
                messageEl.style.color = '#333';
                break;
            default:
                messageEl.style.background = '#17a2b8';
        }
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }, 3000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从URL获取情绪ID
    const pathParts = window.location.pathname.split('/');
    const emotionId = pathParts[pathParts.length - 1];
    
    if (emotionId && emotionId !== 'emotion') {
        new EmotionDetail(emotionId);
    }
});