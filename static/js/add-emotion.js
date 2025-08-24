// 添加情绪页面的JavaScript功能

class AddEmotionPage {
    constructor() {
        this.selectedEmotionType = null;
        this.selectedCustomEmoji = null;
        this.selectedLocation = null;
        this.map = null;
        this.marker = null;
        
        this.init();
    }
    
    init() {
        this.initMap();
        this.bindEvents();
        this.updateIntensityDisplay();
    }
    
    // 初始化地图
    initMap() {
        // 默认位置：北京
        const defaultLat = 39.9042;
        const defaultLng = 116.4074;
        
        this.map = L.map('map').setView([defaultLat, defaultLng], 13);
        
        // 添加地图图层
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // 地图点击事件
        this.map.on('click', (e) => {
            this.setLocation(e.latlng.lat, e.latlng.lng);
        });
    }
    
    // 绑定事件
    bindEvents() {
        // 情绪类型选择
        document.querySelectorAll('.emotion-type').forEach(element => {
            element.addEventListener('click', () => {
                this.selectEmotionType(element);
            });
        });
        
        // 自定义心情选择
        document.querySelectorAll('.custom-emotion').forEach(element => {
            element.addEventListener('click', () => {
                this.selectCustomEmotion(element);
            });
        });
        
        // 强度滑块
        const intensitySlider = document.getElementById('intensitySlider');
        intensitySlider.addEventListener('input', () => {
            this.updateIntensityDisplay();
        });
        
        // 获取当前位置按钮
        document.getElementById('getCurrentLocation').addEventListener('click', () => {
            this.getCurrentLocation();
        });
        
        // 表单提交
        document.getElementById('addEmotionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitEmotion();
        });
    }
    
    // 选择情绪类型
    selectEmotionType(element) {
        // 移除之前的选中状态
        document.querySelectorAll('.emotion-type').forEach(el => {
            el.classList.remove('selected');
        });
        
        // 添加选中状态
        element.classList.add('selected');
        this.selectedEmotionType = element.dataset.type;
        
        // 显示或隐藏自定义心情选择器
        const customSelector = document.getElementById('customEmotionSelector');
        if (element.dataset.type === 'custom') {
            customSelector.style.display = 'block';
        } else {
            customSelector.style.display = 'none';
            this.selectedCustomEmoji = null;
            // 清除自定义emoji选择
            document.querySelectorAll('.custom-emotion').forEach(el => {
                el.classList.remove('selected');
            });
        }
        
        // 清除错误信息
        this.hideError('emotionTypeError');
    }
    
    // 选择自定义心情
    selectCustomEmotion(element) {
        // 移除之前的选中状态
        document.querySelectorAll('.custom-emotion').forEach(el => {
            el.classList.remove('selected');
        });
        
        // 添加选中状态
        element.classList.add('selected');
        this.selectedCustomEmoji = element.dataset.emoji;
        
        // 更新自定义情绪类型的显示
        const customEmotionType = document.querySelector('.emotion-type[data-type="custom"] .emotion-icon');
        if (customEmotionType) {
            customEmotionType.textContent = this.selectedCustomEmoji;
        }
    }
    
    // 更新强度显示
    updateIntensityDisplay() {
        const slider = document.getElementById('intensitySlider');
        const valueDisplay = document.getElementById('intensityValue');
        const value = parseInt(slider.value);
        
        let label = '';
        if (value <= 3) {
            label = '轻微';
        } else if (value <= 7) {
            label = '中等';
        } else {
            label = '强烈';
        }
        
        valueDisplay.textContent = `${label} (${value})`;
    }
    
    // 设置位置
    setLocation(lat, lng) {
        this.selectedLocation = { lat, lng };
        
        // 移除之前的标记
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }
        
        // 添加新标记
        this.marker = L.marker([lat, lng]).addTo(this.map);
        
        // 更新位置信息显示
        this.updateLocationInfo(lat, lng);
        
        // 清除错误信息
        this.hideError('locationError');
    }
    
    // 更新位置信息显示
    async updateLocationInfo(lat, lng) {
        const locationInfo = document.getElementById('locationInfo');
        locationInfo.innerHTML = `已选择位置：纬度 ${lat.toFixed(6)}, 经度 ${lng.toFixed(6)}<br>正在获取地址信息...`;
        
        try {
            // 使用反向地理编码获取地址
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await response.json();
            
            if (data && data.display_name) {
                locationInfo.innerHTML = `已选择位置：${data.display_name}`;
            } else {
                locationInfo.innerHTML = `已选择位置：纬度 ${lat.toFixed(6)}, 经度 ${lng.toFixed(6)}`;
            }
        } catch (error) {
            console.error('获取地址信息失败:', error);
            locationInfo.innerHTML = `已选择位置：纬度 ${lat.toFixed(6)}, 经度 ${lng.toFixed(6)}`;
        }
    }
    
    // 获取当前位置
    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('locationError', '您的浏览器不支持地理定位功能');
            return;
        }
        
        const locationInfo = document.getElementById('locationInfo');
        locationInfo.innerHTML = '正在获取当前位置...';
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // 设置地图中心和位置
                this.map.setView([lat, lng], 15);
                this.setLocation(lat, lng);
            },
            (error) => {
                console.error('获取位置失败:', error);
                let errorMessage = '获取位置失败';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = '用户拒绝了地理定位请求';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = '位置信息不可用';
                        break;
                    case error.TIMEOUT:
                        errorMessage = '获取位置超时';
                        break;
                }
                
                this.showError('locationError', errorMessage);
                locationInfo.innerHTML = '点击地图选择位置，或使用上方按钮获取当前位置';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }
    
    // 验证表单
    validateForm() {
        let isValid = true;
        
        // 验证情绪类型
        if (!this.selectedEmotionType) {
            this.showError('emotionTypeError', '请选择一个情绪类型');
            isValid = false;
        } else if (this.selectedEmotionType === 'custom' && !this.selectedCustomEmoji) {
            this.showError('emotionTypeError', '请选择一个自定义心情表情');
            isValid = false;
        }
        
        // 验证位置
        if (!this.selectedLocation) {
            this.showError('locationError', '请选择一个位置');
            isValid = false;
        }
        
        return isValid;
    }
    
    // 提交情绪
    async submitEmotion() {
        if (!this.validateForm()) {
            return;
        }
        
        const submitButton = document.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = '发布中...';
        submitButton.disabled = true;
        
        try {
            // 获取隐私设置
            const privacyRadio = document.querySelector('input[name="privacy"]:checked');
            const privacySetting = privacyRadio ? privacyRadio.value : 'public';
            
            const formData = {
                emotion_type: this.selectedEmotionType,
                custom_emoji: this.selectedCustomEmoji,
                intensity: parseInt(document.getElementById('intensitySlider').value),
                description: document.getElementById('description').value.trim(),
                latitude: this.selectedLocation.lat,
                longitude: this.selectedLocation.lng,
                privacy_setting: privacySetting
            };
            
            const response = await fetch('/api/emotions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showSuccess('submitMessage', '情绪发布成功！正在跳转到主页...');
                
                // 延迟跳转到主页
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                throw new Error(result.error || '发布失败');
            }
        } catch (error) {
            console.error('提交情绪失败:', error);
            this.showError('submitMessage', `发布失败: ${error.message}`);
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }
    
    // 显示错误信息
    showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = 'error-message';
        element.style.display = 'block';
    }
    
    // 显示成功信息
    showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = 'success-message';
        element.style.display = 'block';
    }
    
    // 隐藏错误信息
    hideError(elementId) {
        const element = document.getElementById(elementId);
        element.style.display = 'none';
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new AddEmotionPage();
});