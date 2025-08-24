// OpenStreetMap + Leaflet 情绪分享地图类
class EmotionMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.emotionMarkers = [];
        this.markerCluster = null;
        this.currentFilter = 'all';
        this.currentTimeFilter = 'all';
        this.userLocation = null;
        this.userLocationMarker = null;
        
        this.init();
    }

    // 初始化地图
    init() {
        // 检查Leaflet是否加载
        if (typeof L === 'undefined') {
            console.error('Leaflet地图库未加载');
            this.showMapError('地图服务暂时不可用，请刷新页面重试');
            return;
        }

        try {
            // 创建地图实例
            this.map = L.map(this.containerId, {
                center: [39.90923, 116.397428], // 北京坐标 (纬度, 经度)
                zoom: 10,
                zoomControl: true,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                dragging: true
            });

            // 添加OpenStreetMap瓦片层
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(this.map);

            // 初始化标记聚合器
            this.markerCluster = L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 80
            });
            this.map.addLayer(this.markerCluster);
            
            // 获取用户位置
            this.getUserLocation();
            
            // 绑定筛选事件
            this.bindFilterEvents();
            
            // 地图加载完成后加载情绪数据
            this.map.whenReady(() => {
                this.loadEmotions();
            });
            
            console.log('Leaflet地图初始化成功');
        } catch (error) {
            console.error('地图初始化失败:', error);
            this.showMapError('地图初始化失败，请检查网络连接');
        }
    }

    // 显示地图错误
    showMapError(message) {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #666; font-size: 16px;">
                    <div style="text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #ffc107;"></i>
                        <p>${message}</p>
                        <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">重新加载</button>
                    </div>
                </div>
            `;
        }
    }

    // 获取用户位置
    getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.userLocation = [lat, lng];
                    
                    // 移动地图到用户位置
                    this.map.setView(this.userLocation, 13);
                    
                    // 添加用户位置标记
                    const userIcon = L.divIcon({
                        html: `
                            <div style="
                                width: 24px; 
                                height: 24px; 
                                background: #007bff; 
                                border: 2px solid white; 
                                border-radius: 50%; 
                                position: relative;
                            ">
                                <div style="
                                    width: 8px; 
                                    height: 8px; 
                                    background: white; 
                                    border-radius: 50%; 
                                    position: absolute; 
                                    top: 50%; 
                                    left: 50%; 
                                    transform: translate(-50%, -50%);
                                "></div>
                            </div>
                        `,
                        className: 'user-location-marker',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    
                    L.marker(this.userLocation, { icon: userIcon })
                        .addTo(this.map)
                        .bindPopup('我的位置');
                },
                (error) => {
                    console.warn('无法获取用户位置:', error);
                }
            );
        }
    }

    // 加载情绪数据
    async loadEmotions() {
        try {
            const response = await fetch('/api/emotions');
            if (!response.ok) {
                throw new Error('获取情绪数据失败');
            }
            
            const data = await response.json();
            this.displayEmotions(data.emotions || []);
        } catch (error) {
            console.error('加载情绪数据失败:', error);
        }
    }

    // 显示情绪数据
    displayEmotions(emotions) {
        // 清除现有标记
        this.emotionMarkers = [];
        this.markerCluster.clearLayers();
        
        emotions.forEach(emotion => {
            if (emotion.latitude && emotion.longitude) {
                const marker = this.createEmotionMarker(emotion);
                this.emotionMarkers.push({
                    marker: marker,
                    emotion: emotion
                });
                this.markerCluster.addLayer(marker);
            }
        });
    }

    // 创建情绪标记
    createEmotionMarker(emotion) {
        const emotionConfig = this.getEmotionConfig(emotion.emotion_type, emotion.custom_emoji);
        
        // 创建自定义图标
        const emotionIcon = L.divIcon({
            html: `
                <div style="
                    width: 32px; 
                    height: 32px; 
                    background: ${emotionConfig.color}; 
                    border: 2px solid white; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 16px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ">${emotionConfig.emoji}</div>
            `,
            className: 'emotion-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
        
        const marker = L.marker([emotion.latitude, emotion.longitude], { 
            icon: emotionIcon,
            title: emotionConfig.name
        });
        
        // 添加点击事件
        marker.on('click', () => {
            this.showEmotionPopup(emotion, marker);
        });
        
        return marker;
    }

    // 获取情绪配置
    getEmotionConfig(emotionType, customEmoji = null) {
        const configs = {
            happy: { name: '开心', emoji: '😊', color: '#FFD700' },
            sad: { name: '难过', emoji: '😢', color: '#4169E1' },
            angry: { name: '愤怒', emoji: '😠', color: '#FF4500' },
            excited: { name: '兴奋', emoji: '🤩', color: '#FF69B4' },
            calm: { name: '平静', emoji: '😌', color: '#98FB98' },
            anxious: { name: '焦虑', emoji: '😰', color: '#DDA0DD' },
            grateful: { name: '感激', emoji: '🙏', color: '#F0E68C' },
            lonely: { name: '孤独', emoji: '😔', color: '#708090' },
            custom: { name: '自定义', emoji: customEmoji || '🎭', color: '#9370DB' }
        };
        
        return configs[emotionType] || { name: '未知', emoji: '❓', color: '#808080' };
    }

    // 显示情绪弹窗
    showEmotionPopup(emotion, marker) {
        const emotionConfig = this.getEmotionConfig(emotion.emotion_type, emotion.custom_emoji);
        const timeAgo = this.getTimeAgo(emotion.created_at);
        
        let content;
        
        // 检查用户是否已登录
        if (!window.isUserLoggedIn) {
            // 未登录用户显示登录提示
            content = `
                <div class="emotion-popup login-required">
                    <div class="emotion-header">
                        <span class="emotion-emoji">${emotionConfig.emoji}</span>
                        <div class="emotion-info">
                            <h3>${emotionConfig.name}</h3>
                            <p class="emotion-time">${timeAgo}</p>
                        </div>
                    </div>
                    <div class="login-prompt">
                        <p>🔒 请先登录后查看详细内容</p>
                        <div class="popup-actions">
                            <button class="btn btn-primary" onclick="showLoginModal()">
                                 <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                                     <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                 </svg>
                                 GitHub 登录
                             </button>
                        </div>
                    </div>
                </div>
            `;
        }
        // 检查隐私设置
        else if (!emotion.is_public) {
            content = `
                <div class="emotion-popup private">
                    <div class="emotion-header">
                        <span class="emotion-emoji">${emotionConfig.emoji}</span>
                        <div class="emotion-info">
                            <h3>${emotionConfig.name}</h3>
                            <p class="emotion-time">${timeAgo}</p>
                        </div>
                    </div>
                    <div class="private-message">
                        <p>🔒 这是一条私密分享，仅在地图上显示位置</p>
                    </div>
                </div>
            `;
        } else {
            content = `
                <div class="emotion-popup">
                    <div class="emotion-header">
                        <span class="emotion-emoji">${emotionConfig.emoji}</span>
                        <div class="emotion-info">
                            <h3>${emotionConfig.name}</h3>
                            <p class="emotion-time">${timeAgo}</p>
                        </div>
                    </div>
                    ${emotion.emotion_text ? `<div class="emotion-text">${this.escapeHtml(emotion.emotion_text)}</div>` : ''}
                    <div class="emotion-stats">
                        <span class="stat">❤️ ${emotion.likes_count || 0}</span>
                        <span class="stat">💬 ${emotion.comments_count || 0}</span>
                        <span class="stat">⭐ ${emotion.collections_count || 0}</span>
                    </div>
                    <div class="popup-actions">
                        <button class="btn btn-sm" onclick="window.location.href='/emotion/${emotion.id}'">
                            查看详情
                        </button>
                    </div>
                </div>
            `;
        }
        
        marker.bindPopup(content, {
            maxWidth: 300,
            className: 'emotion-popup-container'
        }).openPopup();
    }

    // 绑定筛选事件
    bindFilterEvents() {
        // 情绪类型筛选
        const emotionFilter = document.getElementById('emotionFilter');
        if (emotionFilter) {
            emotionFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyFilters();
                this.hideFilterPopups();
            });
        }

        // 时间筛选
        const timeFilter = document.getElementById('timeFilter');
        if (timeFilter) {
            timeFilter.addEventListener('change', (e) => {
                this.currentTimeFilter = e.target.value;
                this.applyFilters();
                this.hideFilterPopups();
            });
        }

        // 绑定新的圆形按钮事件
        this.bindCircularButtonEvents();
    }

    // 绑定圆形按钮事件
    bindCircularButtonEvents() {
        // 定位按钮
        const locateBtn = document.getElementById('locateBtn');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                this.locateUser();
            });
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refresh();
            });
        }

        // 情绪筛选按钮
        const emotionFilterBtn = document.getElementById('emotionFilterBtn');
        if (emotionFilterBtn) {
            emotionFilterBtn.addEventListener('click', () => {
                this.toggleFilterPopup('emotionFilterPopup');
            });
        }

        // 时间筛选按钮
        const timeFilterBtn = document.getElementById('timeFilterBtn');
        if (timeFilterBtn) {
            timeFilterBtn.addEventListener('click', () => {
                this.toggleFilterPopup('timeFilterPopup');
            });
        }

        // 点击地图隐藏弹出框
        if (this.map) {
            this.map.on('click', () => {
                this.hideFilterPopups();
            });
        }
    }

    // 切换筛选弹出框显示
    toggleFilterPopup(popupId) {
        const popup = document.getElementById(popupId);
        if (!popup) return;

        const isVisible = popup.style.display !== 'none';
        
        // 隐藏所有弹出框
        this.hideFilterPopups();
        
        // 如果之前是隐藏的，则显示
        if (!isVisible) {
            popup.style.display = 'block';
        }
    }

    // 隐藏所有筛选弹出框
    hideFilterPopups() {
        const popups = ['emotionFilterPopup', 'timeFilterPopup'];
        popups.forEach(popupId => {
            const popup = document.getElementById(popupId);
            if (popup) {
                popup.style.display = 'none';
            }
        });
    }

    // 定位到用户位置
    locateUser() {
        const locateBtn = document.getElementById('locateBtn');
        
        // 显示加载状态
        if (locateBtn) {
            const originalIcon = locateBtn.innerHTML;
            locateBtn.innerHTML = '<span class="btn-icon">⏳</span>';
            locateBtn.disabled = true;
        }
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.userLocation = [lat, lng];
                    
                    // 移动地图到用户位置
                    this.map.setView(this.userLocation, 15);
                    
                    // 清除之前的用户位置标记
                    this.clearUserLocationMarker();
                    
                    // 添加新的用户位置标记
                    this.addUserLocationMarker();
                    
                    // 恢复按钮状态
                    if (locateBtn) {
                        locateBtn.innerHTML = '<span class="btn-icon">✅</span>';
                        setTimeout(() => {
                            locateBtn.innerHTML = '<span class="btn-icon">📍</span>';
                            locateBtn.disabled = false;
                        }, 1500);
                    }
                },
                (error) => {
                    console.error('定位失败:', error);
                    
                    let errorMessage = '定位失败';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = '用户拒绝了定位请求';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = '位置信息不可用';
                            break;
                        case error.TIMEOUT:
                            errorMessage = '定位请求超时';
                            break;
                    }
                    
                    // 显示错误状态
                    if (locateBtn) {
                        locateBtn.innerHTML = '<span class="btn-icon">❌</span>';
                        locateBtn.title = errorMessage;
                        setTimeout(() => {
                            locateBtn.innerHTML = '<span class="btn-icon">📍</span>';
                            locateBtn.title = '定位到我的位置';
                            locateBtn.disabled = false;
                        }, 2000);
                    }
                    
                    // 显示错误提示
                    this.showNotification(errorMessage, 'error');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5分钟缓存
                }
            );
        } else {
            // 浏览器不支持定位
            if (locateBtn) {
                locateBtn.innerHTML = '<span class="btn-icon">❌</span>';
                locateBtn.title = '浏览器不支持定位功能';
                setTimeout(() => {
                    locateBtn.innerHTML = '<span class="btn-icon">📍</span>';
                    locateBtn.title = '定位到我的位置';
                    locateBtn.disabled = false;
                }, 2000);
            }
            
            this.showNotification('浏览器不支持定位功能', 'error');
        }
    }

    // 应用筛选
    applyFilters() {
        this.markerCluster.clearLayers();
        
        const filteredMarkers = this.emotionMarkers.filter(item => {
            const emotion = item.emotion;
            
            // 情绪类型筛选
            if (this.currentFilter !== 'all' && emotion.emotion_type !== this.currentFilter) {
                return false;
            }
            
            // 时间筛选
            if (this.currentTimeFilter !== 'all') {
                const emotionTime = new Date(emotion.created_at);
                const now = new Date();
                const diffHours = (now - emotionTime) / (1000 * 60 * 60);
                
                switch (this.currentTimeFilter) {
                    case '1h':
                        if (diffHours > 1) return false;
                        break;
                    case '6h':
                        if (diffHours > 6) return false;
                        break;
                    case '24h':
                        if (diffHours > 24) return false;
                        break;
                    case '7d':
                        if (diffHours > 168) return false;
                        break;
                }
            }
            
            return true;
        });
        
        filteredMarkers.forEach(item => {
            this.markerCluster.addLayer(item.marker);
        });
    }

    // 添加新情绪到地图
    addEmotion(emotion) {
        if (emotion.latitude && emotion.longitude) {
            const marker = this.createEmotionMarker(emotion);
            this.emotionMarkers.push({
                marker: marker,
                emotion: emotion
            });
            this.markerCluster.addLayer(marker);
            
            // 移动地图到新位置
            this.map.setView([emotion.latitude, emotion.longitude], 15);
            
            // 显示弹窗
            setTimeout(() => {
                this.showEmotionPopup(emotion, marker);
            }, 500);
        }
    }

    // 获取相对时间
    getTimeAgo(dateString) {
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

    // 显示登录弹窗
    showLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'block';
        }
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 刷新地图数据
    refresh() {
        const refreshBtn = document.getElementById('refreshBtn');
        
        // 显示加载状态
        if (refreshBtn) {
            const originalIcon = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<span class="btn-icon">⏳</span>';
            refreshBtn.disabled = true;
        }
        
        try {
            // 清除现有标记
            if (this.markerCluster) {
                this.markerCluster.clearLayers();
            }
            
            // 清空情绪标记数组
            this.emotionMarkers = [];
            
            // 重置筛选器
            this.currentFilter = 'all';
            this.currentTimeFilter = 'all';
            
            // 更新筛选器UI
            const emotionFilter = document.getElementById('emotionFilter');
            const timeFilter = document.getElementById('timeFilter');
            if (emotionFilter) emotionFilter.value = 'all';
            if (timeFilter) timeFilter.value = 'all';
            
            // 重新加载情绪数据
            this.loadEmotions().then(() => {
                // 显示成功状态
                if (refreshBtn) {
                    refreshBtn.innerHTML = '<span class="btn-icon">✅</span>';
                    setTimeout(() => {
                        refreshBtn.innerHTML = '<span class="btn-icon">🔄</span>';
                        refreshBtn.disabled = false;
                    }, 1500);
                }
                
                this.showNotification('地图数据已刷新', 'success');
            }).catch((error) => {
                console.error('刷新失败:', error);
                
                // 显示错误状态
                if (refreshBtn) {
                    refreshBtn.innerHTML = '<span class="btn-icon">❌</span>';
                    setTimeout(() => {
                        refreshBtn.innerHTML = '<span class="btn-icon">🔄</span>';
                        refreshBtn.disabled = false;
                    }, 2000);
                }
                
                this.showNotification('刷新失败，请检查网络连接', 'error');
            });
        } catch (error) {
            console.error('刷新过程中发生错误:', error);
            
            if (refreshBtn) {
                refreshBtn.innerHTML = '<span class="btn-icon">❌</span>';
                setTimeout(() => {
                    refreshBtn.innerHTML = '<span class="btn-icon">🔄</span>';
                    refreshBtn.disabled = false;
                }, 2000);
            }
            
            this.showNotification('刷新失败', 'error');
        }
    }

    // 清除用户位置标记
    clearUserLocationMarker() {
        if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
            this.userLocationMarker = null;
        }
    }

    // 添加用户位置标记
    addUserLocationMarker() {
        if (!this.userLocation) return;
        
        const userIcon = L.divIcon({
            html: `
                <div style="
                    width: 24px; 
                    height: 24px; 
                    background: #007bff; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    position: relative;
                    box-shadow: 0 2px 8px rgba(0,123,255,0.4);
                    animation: pulse 2s infinite;
                ">
                    <div style="
                        width: 8px; 
                        height: 8px; 
                        background: white; 
                        border-radius: 50%; 
                        position: absolute; 
                        top: 50%; 
                        left: 50%; 
                        transform: translate(-50%, -50%);
                    "></div>
                </div>
                <style>
                    @keyframes pulse {
                        0% { box-shadow: 0 2px 8px rgba(0,123,255,0.4); }
                        50% { box-shadow: 0 2px 16px rgba(0,123,255,0.8); }
                        100% { box-shadow: 0 2px 8px rgba(0,123,255,0.4); }
                    }
                </style>
            `,
            className: 'user-location-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        this.userLocationMarker = L.marker(this.userLocation, { icon: userIcon })
            .addTo(this.map)
            .bindPopup('📍 我的位置');
    }

    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动移除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 获取通知图标
    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // 获取通知颜色
    getNotificationColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    // 销毁地图
    destroy() {
        if (this.map) {
            this.clearUserLocationMarker();
            this.map.remove();
            this.map = null;
        }
    }
}

// 全局地图实例
let emotionMap = null;

// 页面加载完成后初始化地图
document.addEventListener('DOMContentLoaded', function() {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        // 等待Leaflet加载完成
        if (typeof L !== 'undefined') {
            emotionMap = new EmotionMap('map');
        } else {
            // 如果Leaflet未加载，等待加载
            const checkLeaflet = setInterval(() => {
                if (typeof L !== 'undefined') {
                    clearInterval(checkLeaflet);
                    emotionMap = new EmotionMap('map');
                }
            }, 100);
            
            // 10秒后如果还未加载成功，显示错误
            setTimeout(() => {
                if (typeof L === 'undefined') {
                    clearInterval(checkLeaflet);
                    const container = document.getElementById('map');
                    if (container) {
                        container.innerHTML = `
                            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #666; font-size: 16px;">
                                <div style="text-align: center;">
                                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #ffc107;"></i>
                                    <p>地图服务加载失败，请检查网络连接后刷新页面</p>
                                    <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">重新加载</button>
                                </div>
                            </div>
                        `;
                    }
                }
            }, 10000);
        }
        
        // 监听窗口大小变化
        window.addEventListener('resize', function() {
            if (emotionMap && emotionMap.map) {
                emotionMap.map.invalidateSize();
            }
        });
    }
});

// 导出给其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmotionMap;
}