// 全局变量
let apiUrl = '';
let apiKey = '';
let availableModels = [];

// 初始化粒子效果
function initParticles() {
    particlesJS('particles-js', {
        particles: {
            number: {
                value: 80,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: '#8A2BE2'
            },
            shape: {
                type: 'circle'
            },
            opacity: {
                value: 0.5,
                random: false,
                animation: {
                    enable: true,
                    speed: 1,
                    opacity_min: 0.1,
                    sync: false
                }
            },
            size: {
                value: 3,
                random: true,
                animation: {
                    enable: true,
                    speed: 2,
                    size_min: 0.1,
                    sync: false
                }
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#8A2BE2',
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 2,
                direction: 'none',
                random: false,
                straight: false,
                out_mode: 'out',
                bounce: false,
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: {
                    enable: true,
                    mode: 'grab'
                },
                resize: true
            },
            modes: {
                grab: {
                    distance: 140,
                    line_linked: {
                        opacity: 1
                    }
                }
            }
        },
        retina_detect: true
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化粒子效果
    initParticles();

    // 检查是否已经保存了API设置
    const savedApiUrl = localStorage.getItem('apiUrl');
    const savedApiKey = localStorage.getItem('apiKey');
    
    if (savedApiUrl && savedApiKey) {
        document.getElementById('apiUrl').value = savedApiUrl;
        document.getElementById('apiKey').value = savedApiKey;
        saveApiSettings();
    }

    // 为全局输入框添加回车事件监听
    document.getElementById('globalInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendToAll();
        }
    });

    // 初始化聊天窗口
    updateWindowCount();
});

// 保存API设置
async function saveApiSettings() {
    apiUrl = document.getElementById('apiUrl').value.trim();
    apiKey = document.getElementById('apiKey').value.trim();

    if (!apiUrl || !apiKey) {
        alert('请输入API地址和API Key');
        return;
    }

    try {
        // 测试API连接并获取可用模型列表
        const response = await fetch(`${apiUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error('API连接失败');
        }

        const data = await response.json();
        availableModels = data.data.map(model => model.id);

        // 保存设置到本地存储
        localStorage.setItem('apiUrl', apiUrl);
        localStorage.setItem('apiKey', apiKey);

        // 切换到聊天页面
        document.getElementById('apiPage').style.display = 'none';
        document.getElementById('chatPage').style.display = 'block';

        // 初始化聊天窗口
        updateWindowCount();
    } catch (error) {
        alert('API连接失败，请检查设置：' + error.message);
    }
}

// 更新窗口数量
function updateWindowCount() {
    const count = parseInt(document.getElementById('windowCount').value);
    const container = document.getElementById('chatWindows');
    
    // 清空现有窗口
    container.innerHTML = '';
    container.className = 'chat-windows windows-' + count;

    // 创建新窗口
    for (let i = 0; i < count; i++) {
        const template = document.getElementById('chatWindowTemplate');
        const clone = template.content.cloneNode(true);
        
        // 添加模型选项
        const select = clone.querySelector('.model-select');
        availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            select.appendChild(option);
        });

        // 为输入框添加回车事件
        const input = clone.querySelector('.chat-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage(input);
            }
        });

        container.appendChild(clone);

        // 初始化最后添加的 select 元素的 select2
        const addedSelect = container.lastElementChild.querySelector('.model-select');
        $(addedSelect).select2({
            placeholder: '搜索并选择模型...',
            allowClear: true,
            width: '100%',
            theme: 'default',
            language: {
                noResults: function() {
                    return "没有找到匹配的模型";
                },
                searching: function() {
                    return "搜索中...";
                }
            }
        });
    }
}

// 发送消息给所有模型
async function sendToAll() {
    const message = document.getElementById('globalInput').value.trim();
    if (!message) return;

    const windows = document.querySelectorAll('.chat-window');
    windows.forEach(async (window) => {
        const modelSelect = window.querySelector('.model-select');
        if (modelSelect.value) {
            await sendMessageToWindow(window, message);
        }
    });

    document.getElementById('globalInput').value = '';
}

// 发送消息（单个窗口）
async function sendMessage(element) {
    const window = element.closest('.chat-window');
    const input = window.querySelector('.chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    await sendMessageToWindow(window, message);
    input.value = '';
}

// 向指定窗口发送消息
async function sendMessageToWindow(window, message) {
    const messagesContainer = window.querySelector('.chat-messages');
    const modelSelect = window.querySelector('.model-select');
    const selectedModel = modelSelect.value;

    if (!selectedModel) {
        alert('请先选择模型');
        return;
    }

    // 添加用户消息
    appendMessage(messagesContainer, message, 'user');

    try {
        // 发送API请求
        const response = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{
                    role: 'user',
                    content: message
                }]
            })
        });

        if (!response.ok) {
            throw new Error('API请求失败');
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        // 添加模型回复
        appendMessage(messagesContainer, reply, 'bot');
    } catch (error) {
        appendMessage(messagesContainer, '发送失败：' + error.message, 'error');
    }
}

// 添加消息到对话窗口
function appendMessage(container, content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    // 使用marked渲染Markdown内容
    messageDiv.innerHTML = marked.parse(content);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString();
    
    messageDiv.appendChild(timeDiv);
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// 清除输入
function clearInput(button) {
    const window = button.closest('.chat-window');
    const input = window.querySelector('.chat-input');
    input.value = '';
}

// 导出当前对话
function exportChat(button) {
    const window = button.closest('.chat-window');
    const messages = window.querySelectorAll('.message');
    const modelName = window.querySelector('.model-select').value;
    
    exportMessages(Array.from(messages), modelName);
}

// 导出所有对话
function exportAllChats() {
    const windows = document.querySelectorAll('.chat-window');
    let allMessages = [];
    
    windows.forEach(window => {
        const messages = window.querySelectorAll('.message');
        const modelName = window.querySelector('.model-select').value;
        
        messages.forEach(message => {
            const time = message.querySelector('.message-time').textContent;
            const content = message.innerHTML.split('<div class="message-time">')[0];
            const type = message.classList.contains('user-message') ? '用户' : '模型';
            
            allMessages.push({
                身份: type,
                发送内容: content,
                发送时间: time,
                模型名称: modelName
            });
        });
    });
    
    exportToCSV(allMessages);
}

// 导出消息到CSV
function exportMessages(messages, modelName) {
    const data = messages.map(message => {
        const time = message.querySelector('.message-time').textContent;
        const content = message.innerHTML.split('<div class="message-time">')[0];
        const type = message.classList.contains('user-message') ? '用户' : '模型';
        
        return {
            身份: type,
            发送内容: content,
            发送时间: time,
            模型名称: modelName
        };
    });
    
    exportToCSV(data);
}

// 导出数据到CSV文件
function exportToCSV(data) {
    const headers = ['身份', '发送内容', '发送时间', '模型名称'];
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => 
                JSON.stringify(row[header] || '')
            ).join(',')
        )
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `chat_export_${new Date().toISOString()}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
} 