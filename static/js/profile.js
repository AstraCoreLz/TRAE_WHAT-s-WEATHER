// 个人页面功能
class ProfileManager {
    constructor() {
        this.currentTab = 'my-emotions';
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.emotions = [];
        this.collections = [];
        this.stats = {};
        this.init();
    }

    // 初始化
    init() {
        this.loadUserStats();
        this.bindEvents();
        this.loadTabContent();
    }

    // 绑定事件
    bindEvents() {
        // 标签页切换
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                const tabId = e.target.dataset.tab;
                this.switchTab(tabId);
            }
        });

        // 情绪编辑
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-emotion-btn')) {
                const emotionId = e.target.closest('.edit-emotion-btn').dataset.emotionId;
                this.openEditModal(emotionId);
            }
        });

        // 情绪删除
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-emotion-btn')) {
                const emotionId = e.target.closest('.delete-emotion-btn').dataset.emotionId;
                this.deleteEmotion(emotionId);
            }
        });

        // 取消收藏
        document.addEventListener('click', (e) => {
            if (e.target.closest('.uncollect-btn')) {
                const emotionId = e.target.closest('.uncollect-btn').dataset.emotionId;
                this.uncollectEmotion(emotionId);
            }
        });

        // 分页
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-btn')) {
                const page = parseInt(e.target.dataset.page);
                this.changePage(page);
            }
        });

        // 编辑表单提交
        const editForm = document.getElementById('editEmotionForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.submitEdit(e));
        }

        // 编辑表单字符计数
        const editTextInput = document.getElementById('editEmotionText');
        if (editTextInput) {
            editTextInput.addEventListener('input', () => this.updateEditCharCount());
        }

        // 模态框关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('close')) {
                this.closeModal(e.target.closest('.modal'));
            }
        });

        // 隐私设置切换
        document.addEventListener('change', (e) => {
            if (e.target.id === 'editIsPublic') {
                this.toggleCollectionPermission();
            }
        });
    }

    // 加载用户统计
    async loadUserStats() {
        try {
            const response = await fetch('/api/user/stats');
            if (response.ok) {
                const data = await response.json();
                this.stats = data.stats;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('加载用户统计失败:', error);
        }
    }

    // 更新统计显示
    updateStatsDisplay() {
        const emotionsCountEl = document.getElementById('emotionsCount');
        const likesCountEl = document.getElementById('totalLikes');
        const collectionsCountEl = document.getElementById('totalCollections');

        if (emotionsCountEl) emotionsCountEl.textContent = this.stats.emotions_count || 0;
        if (likesCountEl) likesCountEl.textContent = this.stats.total_likes || 0;
        if (collectionsCountEl) collectionsCountEl.textContent = this.stats.total_collections || 0;
    }

    // 切换标签页
    switchTab(tabId) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

        // 更新内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');

        this.currentTab = tabId;
        this.currentPage = 1;
        this.loadTabContent();
    }

    // 加载标签页内容
    async loadTabContent() {
        switch (this.currentTab) {
            case 'my-emotions':
                await this.loadMyEmotions();
                break;
            case 'my-collections':
                await this.loadMyCollections();
                break;
            case 'emotion-analysis':
                await this.loadEmotionAnalysis();
                break;
        }
    }

    // 加载我的情绪
    async loadMyEmotions() {
        try {
            const response = await fetch(`/api/user/emotions?page=${this.currentPage}&limit=${this.pageSize}`);
            if (response.ok) {
                const data = await response.json();
                this.emotions = data.emotions;
                this.totalPages = data.total_pages;
                this.displayMyEmotions();
                this.updatePagination();
            }
        } catch (error) {
            console.error('加载我的情绪失败:', error);
            this.showMessage('加载失败', 'error');
        }
    }

    // 显示我的情绪
    displayMyEmotions() {
        const container = document.getElementById('myEmotionsList');
        if (!container) return;

        if (this.emotions.length === 0) {
            container.innerHTML = '<p class="no-data">还没有分享过情绪，去<a href="/">首页</a>分享一个吧~</p>';
            return;
        }

        container.innerHTML = this.emotions.map(emotion => `
            <div class="emotion-card" data-emotion-id="${emotion.id}">
                <div class="emotion-header">
                    <div class="emotion-info">
                        <span class="emotion-emoji">${this.getEmotionEmoji(emotion.emotion_type, emotion.custom_emoji)}</span>
                        <div class="emotion-details">
                            <span class="emotion-type">${this.getEmotionName(emotion.emotion_type)}</span>
                            <span class="emotion-time">${this.formatTime(emotion.created_at)}</span>
                        </div>
                    </div>
                    <div class="emotion-actions">
                        <button class="action-btn edit-emotion-btn" data-emotion-id="${emotion.id}" title="编辑">
                            ✏️
                        </button>
                        <button class="action-btn delete-emotion-btn" data-emotion-id="${emotion.id}" title="删除">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="emotion-content">
                    <p class="emotion-text">${emotion.emotion_text || '没有文字描述'}</p>
                    <div class="emotion-meta">
                        <span class="privacy-status ${emotion.is_public ? 'public' : 'private'}">
                            ${emotion.is_public ? '🌍 公开' : '🔒 私密'}
                        </span>
                        ${emotion.intensity ? `<span class="emotion-intensity">💪 强度: ${emotion.intensity}/10</span>` : ''}
                        <span class="location">📍 ${emotion.latitude.toFixed(4)}, ${emotion.longitude.toFixed(4)}</span>
                    </div>
                </div>
                <div class="emotion-stats">
                    <span class="stat-item">❤️ ${emotion.likes_count || 0}</span>
                    <span class="stat-item">⭐ ${emotion.collections_count || 0}</span>
                    <span class="stat-item">💬 ${emotion.comments_count || 0}</span>
                    <a href="/emotion/${emotion.id}" class="view-detail-btn">查看详情</a>
                </div>
            </div>
        `).join('');
    }

    // 加载我的收藏
    async loadMyCollections() {
        try {
            const response = await fetch(`/api/user/collections?page=${this.currentPage}&limit=${this.pageSize}`);
            if (response.ok) {
                const data = await response.json();
                this.collections = data.collections;
                this.totalPages = data.total_pages;
                this.displayMyCollections();
                this.updatePagination();
            }
        } catch (error) {
            console.error('加载我的收藏失败:', error);
            this.showMessage('加载失败', 'error');
        }
    }

    // 显示我的收藏
    displayMyCollections() {
        const container = document.getElementById('myCollectionsList');
        if (!container) return;

        if (this.collections.length === 0) {
            container.innerHTML = '<p class="no-data">还没有收藏任何情绪，去<a href="/">首页</a>看看吧~</p>';
            return;
        }

        container.innerHTML = this.collections.map(item => {
            const emotion = item.emotion;
            return `
                <div class="emotion-card" data-emotion-id="${emotion.id}">
                    <div class="emotion-header">
                        <div class="emotion-info">
                            <span class="emotion-emoji">${this.getEmotionEmoji(emotion.emotion_type, emotion.custom_emoji)}</span>
                            <div class="emotion-details">
                                <span class="emotion-type">${this.getEmotionName(emotion.emotion_type)}</span>
                                <span class="emotion-time">收藏于 ${this.formatTime(item.created_at)}</span>
                            </div>
                        </div>
                        <div class="emotion-actions">
                            <button class="action-btn uncollect-btn" data-emotion-id="${emotion.id}" title="取消收藏">
                                ⭐
                            </button>
                        </div>
                    </div>
                    <div class="emotion-content">
                        <p class="emotion-text">${emotion.emotion_text || '没有文字描述'}</p>
                        <div class="emotion-meta">
                            <span class="author">👤 ${emotion.username}</span>
                            <span class="location">📍 ${emotion.latitude.toFixed(4)}, ${emotion.longitude.toFixed(4)}</span>
                        </div>
                    </div>
                    <div class="emotion-stats">
                        <span class="stat-item">❤️ ${emotion.likes_count || 0}</span>
                        <span class="stat-item">⭐ ${emotion.collections_count || 0}</span>
                        <span class="stat-item">💬 ${emotion.comments_count || 0}</span>
                        <a href="/emotion/${emotion.id}" class="view-detail-btn">查看详情</a>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 加载情绪分析
    async loadEmotionAnalysis() {
        try {
            const response = await fetch('/api/user/emotion-analysis');
            if (response.ok) {
                const data = await response.json();
                this.displayEmotionAnalysis(data.analysis);
            }
        } catch (error) {
            console.error('加载情绪分析失败:', error);
            this.showMessage('加载失败', 'error');
        }
    }

    // 显示情绪分析
    displayEmotionAnalysis(analysis) {
        const container = document.getElementById('emotionAnalysisContent');
        if (!container) return;

        if (!analysis || Object.keys(analysis).length === 0) {
            container.innerHTML = '<p class="no-data">暂无足够数据进行分析，多分享一些情绪吧~</p>';
            return;
        }

        // 情绪分布
        const emotionDistribution = analysis.emotion_distribution || {};
        const totalEmotions = Object.values(emotionDistribution).reduce((sum, count) => sum + count, 0);

        // 时间趋势
        const timeTrend = analysis.time_trend || {};

        // 最活跃时段
        const mostActiveHour = analysis.most_active_hour || 0;

        container.innerHTML = `
            <div class="analysis-section">
                <h3>📊 情绪分布</h3>
                <div class="emotion-distribution">
                    ${Object.entries(emotionDistribution).map(([emotion, count]) => {
                        const percentage = totalEmotions > 0 ? (count / totalEmotions * 100).toFixed(1) : 0;
                        return `
                            <div class="emotion-stat">
                                <div class="emotion-label">
                                    <span class="emotion-emoji">${this.getEmotionEmoji(emotion)}</span>
                                    <span class="emotion-name">${this.getEmotionName(emotion)}</span>
                                </div>
                                <div class="emotion-bar">
                                    <div class="emotion-progress" style="width: ${percentage}%"></div>
                                </div>
                                <span class="emotion-percentage">${percentage}%</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="analysis-section">
                <h3>📈 最近趋势</h3>
                <div class="trend-info">
                    <div class="trend-item">
                        <span class="trend-label">最常出现的情绪：</span>
                        <span class="trend-value">
                            ${this.getEmotionEmoji(analysis.most_common_emotion)} 
                            ${this.getEmotionName(analysis.most_common_emotion)}
                        </span>
                    </div>
                    <div class="trend-item">
                        <span class="trend-label">最活跃时段：</span>
                        <span class="trend-value">${mostActiveHour}:00 - ${mostActiveHour + 1}:00</span>
                    </div>
                    <div class="trend-item">
                        <span class="trend-label">平均每日分享：</span>
                        <span class="trend-value">${(analysis.daily_average || 0).toFixed(1)} 次</span>
                    </div>
                </div>
            </div>
            
            <div class="analysis-section">
                <h3>💡 情绪洞察</h3>
                <div class="insights">
                    ${this.generateInsights(analysis)}
                </div>
            </div>
        `;
    }

    // 生成情绪洞察
    generateInsights(analysis) {
        const insights = [];
        
        if (analysis.most_common_emotion) {
            const emotionName = this.getEmotionName(analysis.most_common_emotion);
            insights.push(`你最常分享的是${emotionName}情绪，这反映了你的主要情感状态。`);
        }
        
        if (analysis.most_active_hour !== undefined) {
            const hour = analysis.most_active_hour;
            let timeDesc = '';
            if (hour >= 6 && hour < 12) {
                timeDesc = '上午';
            } else if (hour >= 12 && hour < 18) {
                timeDesc = '下午';
            } else if (hour >= 18 && hour < 24) {
                timeDesc = '晚上';
            } else {
                timeDesc = '深夜';
            }
            insights.push(`你在${timeDesc}最活跃，这可能是你情感表达的黄金时段。`);
        }
        
        if (analysis.daily_average && analysis.daily_average > 1) {
            insights.push('你是一个善于表达情感的人，经常与他人分享内心感受。');
        } else if (analysis.daily_average && analysis.daily_average < 0.5) {
            insights.push('你比较内敛，偶尔分享情感，每次分享都很珍贵。');
        }
        
        if (insights.length === 0) {
            insights.push('继续记录你的情绪，我们会为你提供更多有趣的洞察！');
        }
        
        return insights.map(insight => `<p class="insight-item">💭 ${insight}</p>`).join('');
    }

    // 打开编辑模态框
    async openEditModal(emotionId) {
        try {
            const response = await fetch(`/api/emotions/${emotionId}`);
            if (response.ok) {
                const data = await response.json();
                const emotion = data.emotion;
                
                // 填充表单
                document.getElementById('editEmotionId').value = emotion.id;
                document.getElementById('editEmotionType').value = emotion.emotion_type;
                document.getElementById('editEmotionText').value = emotion.emotion_text || '';
                document.getElementById('editIsPublic').checked = emotion.is_public;
                document.getElementById('editAllowCollection').checked = emotion.allow_collection;
                
                this.updateEditCharCount();
                this.toggleCollectionPermission();
                
                // 显示模态框
                const modal = document.getElementById('editEmotionModal');
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        } catch (error) {
            console.error('加载情绪数据失败:', error);
            this.showMessage('加载失败', 'error');
        }
    }

    // 提交编辑
    async submitEdit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const emotionId = formData.get('emotion_id');
        
        const data = {
            emotion_type: formData.get('emotion_type'),
            emotion_text: formData.get('emotion_text'),
            is_public: formData.has('is_public'),
            allow_collection: formData.has('allow_collection')
        };
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '保存中...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`/api/emotions/${emotionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                this.closeModal(document.getElementById('editEmotionModal'));
                this.loadTabContent(); // 重新加载当前标签页内容
                this.showMessage('情绪更新成功', 'success');
            } else {
                const result = await response.json();
                this.showMessage(result.message || '更新失败', 'error');
            }
        } catch (error) {
            console.error('更新情绪失败:', error);
            this.showMessage('网络错误', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // 删除情绪
    async deleteEmotion(emotionId) {
        if (!confirm('确定要删除这个情绪吗？删除后无法恢复。')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/emotions/${emotionId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.loadTabContent(); // 重新加载当前标签页内容
                this.loadUserStats(); // 更新统计
                this.showMessage('情绪删除成功', 'success');
            } else {
                const result = await response.json();
                this.showMessage(result.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除情绪失败:', error);
            this.showMessage('网络错误', 'error');
        }
    }

    // 取消收藏
    async uncollectEmotion(emotionId) {
        try {
            const response = await fetch(`/api/emotions/${emotionId}/collect`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.loadTabContent(); // 重新加载当前标签页内容
                this.showMessage('已取消收藏', 'success');
            } else {
                const result = await response.json();
                this.showMessage(result.message || '操作失败', 'error');
            }
        } catch (error) {
            console.error('取消收藏失败:', error);
            this.showMessage('网络错误', 'error');
        }
    }

    // 切换页面
    changePage(page) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.loadTabContent();
        }
    }

    // 更新分页
    updatePagination() {
        const paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer || this.totalPages <= 1) {
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        let paginationHTML = '';
        
        // 上一页
        if (this.currentPage > 1) {
            paginationHTML += `<button class="page-btn" data-page="${this.currentPage - 1}">上一页</button>`;
        }
        
        // 页码
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            paginationHTML += `<button class="page-btn ${activeClass}" data-page="${i}">${i}</button>`;
        }
        
        // 下一页
        if (this.currentPage < this.totalPages) {
            paginationHTML += `<button class="page-btn" data-page="${this.currentPage + 1}">下一页</button>`;
        }
        
        paginationContainer.innerHTML = paginationHTML;
    }

    // 更新编辑字符计数
    updateEditCharCount() {
        const textInput = document.getElementById('editEmotionText');
        const charCount = document.getElementById('editCharCount');
        
        if (textInput && charCount) {
            const currentLength = textInput.value.length;
            const maxLength = textInput.getAttribute('maxlength') || 200;
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

    // 切换收藏权限
    toggleCollectionPermission() {
        const isPublicCheckbox = document.getElementById('editIsPublic');
        const allowCollectionCheckbox = document.getElementById('editAllowCollection');
        const collectionGroup = document.querySelector('.collection-permission-group');
        
        if (isPublicCheckbox && allowCollectionCheckbox && collectionGroup) {
            if (isPublicCheckbox.checked) {
                collectionGroup.style.display = 'block';
            } else {
                collectionGroup.style.display = 'none';
                allowCollectionCheckbox.checked = false;
            }
        }
    }

    // 关闭模态框
    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
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
            'grateful': '感激',
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
    new ProfileManager();
});