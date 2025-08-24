// 情绪相关功能
class EmotionManager {
    constructor() {
        this.currentLocation = null;
        this.selectedEmotion = null;
        this.isSubmitting = false;
        this.init();
    }

    // 初始化
    init() {
        this.bindEvents();
        this.getCurrentLocation();
    }

    // 绑定事件
    bindEvents() {
        // 分享情绪按钮
        const shareBtn = document.getElementById('shareEmotionBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.openEmotionModal());
        }

        // 情绪选择
        document.addEventListener('click', (e) => {
            if (e.target.closest('.emotion-option')) {
                this.selectEmotion(e.target.closest('.emotion-option'));
            }
        });

        // 表单提交
        const emotionForm = document.getElementById('emotionForm');
        if (emotionForm) {
            emotionForm.addEventListener('submit', (e) => this.submitEmotion(e));
        }

        // 字符计数
        const textInput = document.getElementById('emotionText');
        if (textInput) {
            textInput.addEventListener('input', () => this.updateCharCount());
        }

        // 获取位置按钮
        const locationBtn = document.getElementById('getLocationBtn');
        if (locationBtn) {
            locationBtn.addEventListener('click', () => this.getCurrentLocation(true));
        }

        // 模态框关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('close')) {
                this.closeModal(e.target.closest('.modal'));
            }
        });

        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="block"]');
                if (openModal) {
                    this.closeModal(openModal);
                }
            }
        });
    }

    // 打开情绪分享模态框
    openEmotionModal(emotionData = null) {
        const modal = document.getElementById('emotionModal');
        if (!modal) return;

        // 重置表单
        this.resetForm();

        // 如果是编辑模式
        if (emotionData) {
            this.fillForm(emotionData);
            document.querySelector('#emotionModal .modal-header h2').textContent = '编辑情绪';
        } else {
            document.querySelector('#emotionModal .modal-header h2').textContent = '分享你的情绪';
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // 关闭模态框
    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // 选择情绪
    selectEmotion(emotionElement) {
        // 移除其他选中状态
        document.querySelectorAll('.emotion-option').forEach(el => {
            el.classList.remove('selected');
        });

        // 添加选中状态
        emotionElement.classList.add('selected');
        this.selectedEmotion = emotionElement.dataset.emotion;
    }

    // 获取当前位置
    getCurrentLocation(showStatus = false) {
        const statusEl = document.getElementById('locationStatus');
        
        if (showStatus && statusEl) {
            statusEl.className = 'location-status loading';
            statusEl.textContent = '正在获取位置信息...';
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    
                    if (showStatus && statusEl) {
                        statusEl.className = 'location-status success';
                        statusEl.textContent = '✓ 位置获取成功';
                    }
                },
                (error) => {
                    console.error('位置获取失败:', error);
                    
                    if (showStatus && statusEl) {
                        statusEl.className = 'location-status error';
                        statusEl.textContent = '位置获取失败，将使用默认位置';
                    }
                    
                    // 使用默认位置（北京）
                    this.currentLocation = {
                        latitude: 39.9042,
                        longitude: 116.4074
                    };
                },
                {
                    timeout: 10000,
                    enableHighAccuracy: true
                }
            );
        } else {
            if (showStatus && statusEl) {
                statusEl.className = 'location-status error';
                statusEl.textContent = '浏览器不支持位置服务';
            }
            
            // 使用默认位置
            this.currentLocation = {
                latitude: 39.9042,
                longitude: 116.4074
            };
        }
    }

    // 更新字符计数
    updateCharCount() {
        const textInput = document.getElementById('emotionText');
        const charCount = document.getElementById('charCount');
        
        if (textInput && charCount) {
            const currentLength = textInput.value.length;
            const maxLength = textInput.getAttribute('maxlength') || 500;
            charCount.textContent = `${currentLength}/${maxLength}`;
            
            // 接近限制时改变颜色
            if (currentLength > maxLength * 0.9) {
                charCount.style.color = '#dc3545';
            } else if (currentLength > maxLength * 0.7) {
                charCount.style.color = '#ffc107';
            } else {
                charCount.style.color = '#6c757d';
            }
        }
    }

    // 提交情绪
    async submitEmotion(event) {
        event.preventDefault();
        
        if (this.isSubmitting) return;
        
        // 验证表单
        if (!this.validateForm()) {
            return;
        }
        
        this.isSubmitting = true;
        const submitBtn = document.querySelector('#emotionForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '提交中...';
        submitBtn.disabled = true;
        
        try {
            const formData = this.getFormData();
            const response = await fetch('/api/emotions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showMessage('情绪分享成功！', 'success');
                this.closeModal(document.getElementById('emotionModal'));
                
                // 刷新地图和列表
                if (window.emotionMap) {
                    window.emotionMap.addEmotion(result.emotion);
                }
                
                // 刷新页面数据
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } else {
                this.showMessage(result.message || '提交失败，请重试', 'error');
            }
            
        } catch (error) {
            console.error('提交情绪失败:', error);
            this.showMessage('网络错误，请重试', 'error');
        } finally {
            this.isSubmitting = false;
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // 验证表单
    validateForm() {
        // 检查是否选择了情绪
        if (!this.selectedEmotion) {
            this.showMessage('请选择一个情绪', 'error');
            return false;
        }
        
        // 检查位置信息
        if (!this.currentLocation) {
            this.showMessage('正在获取位置信息，请稍后重试', 'error');
            this.getCurrentLocation();
            return false;
        }
        
        return true;
    }

    // 获取表单数据
    getFormData() {
        const textInput = document.getElementById('emotionText');
        const isPublicCheckbox = document.getElementById('isPublic');
        const allowCollectionCheckbox = document.getElementById('allowCollection');
        
        return {
            emotion_type: this.selectedEmotion,
            emotion_text: textInput ? textInput.value.trim() : '',
            latitude: this.currentLocation.latitude,
            longitude: this.currentLocation.longitude,
            is_public: isPublicCheckbox ? isPublicCheckbox.checked : true,
            allow_collection: allowCollectionCheckbox ? allowCollectionCheckbox.checked : true
        };
    }

    // 重置表单
    resetForm() {
        // 清除情绪选择
        document.querySelectorAll('.emotion-option').forEach(el => {
            el.classList.remove('selected');
        });
        this.selectedEmotion = null;
        
        // 清除文本
        const textInput = document.getElementById('emotionText');
        if (textInput) {
            textInput.value = '';
            this.updateCharCount();
        }
        
        // 重置隐私设置
        const isPublicCheckbox = document.getElementById('isPublic');
        const allowCollectionCheckbox = document.getElementById('allowCollection');
        
        if (isPublicCheckbox) isPublicCheckbox.checked = true;
        if (allowCollectionCheckbox) allowCollectionCheckbox.checked = true;
        
        // 清除位置状态
        const statusEl = document.getElementById('locationStatus');
        if (statusEl) {
            statusEl.className = 'location-status';
            statusEl.textContent = '';
        }
    }

    // 填充表单（编辑模式）
    fillForm(emotionData) {
        // 选择情绪
        const emotionOption = document.querySelector(`[data-emotion="${emotionData.emotion_type}"]`);
        if (emotionOption) {
            this.selectEmotion(emotionOption);
        }
        
        // 填充文本
        const textInput = document.getElementById('emotionText');
        if (textInput && emotionData.emotion_text) {
            textInput.value = emotionData.emotion_text;
            this.updateCharCount();
        }
        
        // 设置隐私选项
        const isPublicCheckbox = document.getElementById('isPublic');
        const allowCollectionCheckbox = document.getElementById('allowCollection');
        
        if (isPublicCheckbox) isPublicCheckbox.checked = emotionData.is_public;
        if (allowCollectionCheckbox) allowCollectionCheckbox.checked = emotionData.allow_collection;
    }

    // 显示消息
    showMessage(message, type = 'info') {
        // 移除现有消息
        const existingMessage = document.querySelector('.message-toast');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message-toast ${type}`;
        messageEl.textContent = message;
        
        // 添加样式
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
        
        // 设置背景色
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
        
        // 自动移除
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }, 3000);
    }

    // 删除情绪
    async deleteEmotion(emotionId) {
        if (!confirm('确定要删除这条情绪分享吗？')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/emotions/${emotionId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showMessage('删除成功', 'success');
                // 刷新页面
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                const result = await response.json();
                this.showMessage(result.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除情绪失败:', error);
            this.showMessage('网络错误，请重试', 'error');
        }
    }

    // 编辑情绪
    editEmotion(emotionId) {
        // 获取情绪数据
        fetch(`/api/emotions/${emotionId}`)
            .then(response => response.json())
            .then(data => {
                if (data.emotion) {
                    this.openEmotionModal(data.emotion);
                }
            })
            .catch(error => {
                console.error('获取情绪数据失败:', error);
                this.showMessage('获取数据失败', 'error');
            });
    }
}

// 全局情绪管理器实例
let emotionManager = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    emotionManager = new EmotionManager();
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});

// 导出给其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmotionManager;
}