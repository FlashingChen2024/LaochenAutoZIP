// 全局变量
let isPackaging = false;
let statusCheckInterval = null;

// DOM元素
let outputPathInput, browseBtn, packBtn, shutdownBtn, statusText, progressFill, progressText, resultMessage, folderInput;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    outputPathInput = document.getElementById('output-path');
    browseBtn = document.getElementById('browse-btn');
    packBtn = document.getElementById('pack-btn');
    shutdownBtn = document.getElementById('shutdown-btn');
    statusText = document.getElementById('status-text');
    progressFill = document.getElementById('progress-fill');
    progressText = document.getElementById('progress-text');
    resultMessage = document.getElementById('result-message');
    folderInput = document.getElementById('folder-input');
    
    // 检查关键元素是否存在
    if (!outputPathInput || !browseBtn || !packBtn || !shutdownBtn) {
        console.error('关键DOM元素未找到');
        return;
    }
    
    initializeEventListeners();
    restoreLastPath();
    updatePackButtonState();
});

// 恢复上次使用的路径
function restoreLastPath() {
    try {
        // 清理过期的缓存数据
        cleanExpiredCache();
        
        // 优先恢复File System Access API的路径
        const lastFolderName = localStorage.getItem('autozip_last_folder_name');
        const lastFolderTime = localStorage.getItem('autozip_last_folder_time');
        
        // 如果有API选择的文件夹且不超过24小时
        if (lastFolderName && lastFolderTime && (Date.now() - parseInt(lastFolderTime)) < 24 * 60 * 60 * 1000) {
            outputPathInput.value = lastFolderName;
            outputPathInput.placeholder = `上次选择: ${lastFolderName}`;
            return;
        }
        
        // 否则尝试恢复手动输入的路径
        const lastManualPath = localStorage.getItem('autozip_last_manual_path');
        const lastManualTime = localStorage.getItem('autozip_last_manual_time');
        
        if (lastManualPath && lastManualTime && (Date.now() - parseInt(lastManualTime)) < 24 * 60 * 60 * 1000) {
            outputPathInput.value = lastManualPath;
            outputPathInput.placeholder = `上次选择: ${lastManualPath}`;
        }
    } catch (error) {
        console.warn('恢复路径失败:', error);
    }
}

// 清理过期的缓存数据
function cleanExpiredCache() {
    try {
        const now = Date.now();
        const expireTime = 24 * 60 * 60 * 1000; // 24小时
        
        // 清理过期的完整路径缓存
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('autozip_full_path_time_')) {
                const time = localStorage.getItem(key);
                if (time && (now - parseInt(time)) > expireTime) {
                    const pathKey = key.replace('_time_', '_');
                    localStorage.removeItem(key);
                    localStorage.removeItem(pathKey);
                    i--; // 调整索引，因为删除了项目
                }
            }
        }
        
        // 清理过期的基本路径缓存
        const folderTime = localStorage.getItem('autozip_last_folder_time');
        if (folderTime && (now - parseInt(folderTime)) > expireTime) {
            localStorage.removeItem('autozip_last_folder_name');
            localStorage.removeItem('autozip_last_folder_time');
        }
        
        const manualTime = localStorage.getItem('autozip_last_manual_time');
        if (manualTime && (now - parseInt(manualTime)) > expireTime) {
            localStorage.removeItem('autozip_last_manual_path');
            localStorage.removeItem('autozip_last_manual_time');
        }
    } catch (error) {
        console.warn('清理缓存失败:', error);
    }
}

// 初始化事件监听器
function initializeEventListeners() {
    // 浏览按钮点击事件
    browseBtn.addEventListener('click', function() {
        // 由于Web安全限制，我们需要提供一个输入框让用户手动输入路径
        showPathInputDialog();
    });
    
    // 路径输入框点击事件
    outputPathInput.addEventListener('click', function() {
        // 如果支持文件选择API，优先使用；否则手动输入
        if ('showDirectoryPicker' in window) {
            showPathInputDialog();
        } else {
            showManualPathInput();
        }
    });
    
    // 打包按钮点击事件
    packBtn.addEventListener('click', function() {
        if (!isPackaging) {
            startPacking();
        }
    });
    
    // 路径输入变化事件
    outputPathInput.addEventListener('input', function() {
        updatePackButtonState();
    });
    
    // 关闭程序按钮点击事件
    shutdownBtn.addEventListener('click', function() {
        shutdownApplication();
    });
}

// 显示文件夹选择对话框
async function showPathInputDialog() {
    try {
        // 检查浏览器是否支持 File System Access API
        if ('showDirectoryPicker' in window) {
            const directoryHandle = await window.showDirectoryPicker();
            const folderName = directoryHandle.name;
            
            // 保存文件夹句柄和名称到localStorage
            localStorage.setItem('autozip_last_folder_name', folderName);
            localStorage.setItem('autozip_last_folder_time', Date.now().toString());
            
            outputPathInput.value = folderName;
            // 存储目录句柄供后续使用
            outputPathInput.directoryHandle = directoryHandle;
            updatePackButtonState();
        } else {
            // 降级到手动输入
            showManualPathInput();
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('文件夹选择错误:', error);
            // 如果API调用失败，降级到手动输入
            showManualPathInput();
        }
    }
}

// 手动输入路径（降级方案）
function showManualPathInput() {
    // 尝试从localStorage获取上次的路径
    const lastPath = localStorage.getItem('autozip_last_manual_path') || outputPathInput.value || 'C:\\';
    
    const path = prompt('请输入输出文件夹路径:', lastPath);
    if (path !== null && path.trim() !== '') {
        const trimmedPath = path.trim();
        outputPathInput.value = trimmedPath;
        outputPathInput.directoryHandle = null; // 清除目录句柄
        
        // 保存路径到localStorage
        localStorage.setItem('autozip_last_manual_path', trimmedPath);
        localStorage.setItem('autozip_last_manual_time', Date.now().toString());
        
        updatePackButtonState();
    }
}

// 更新打包按钮状态
function updatePackButtonState() {
    const hasPath = outputPathInput.value.trim() !== '';
    packBtn.disabled = !hasPath || isPackaging;
    
    if (isPackaging) {
        packBtn.classList.add('packing');
        packBtn.innerHTML = `
            <div class="loading"></div>
            正在打包...
        `;
    } else {
        packBtn.classList.remove('packing');
        packBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            立即打包
        `;
    }
}

// 开始打包
async function startPacking() {
    const outputPath = outputPathInput.value.trim();
    
    if (!outputPath) {
        showMessage('请选择输出路径', 'error');
        return;
    }
    
    try {
        isPackaging = true;
        updatePackButtonState();
        hideMessage();
        updateStatus('正在准备打包...', 'packing', 0);
        
        let finalOutputPath = outputPath;
        
        // 如果使用了File System Access API，尝试获取完整路径
        if (outputPathInput.directoryHandle) {
            try {
                // 检查是否有保存的完整路径
                const savedFullPath = localStorage.getItem(`autozip_full_path_${outputPath}`);
                const savedTime = localStorage.getItem(`autozip_full_path_time_${outputPath}`);
                
                // 如果有保存的路径且不超过24小时，直接使用
                if (savedFullPath && savedTime && (Date.now() - parseInt(savedTime)) < 24 * 60 * 60 * 1000) {
                    finalOutputPath = savedFullPath;
                    console.log('使用保存的路径:', finalOutputPath);
                } else {
                    // 对于File System Access API，我们需要提示用户手动输入完整路径
                    // 因为浏览器安全限制，无法直接获取文件系统路径
                    const defaultPath = savedFullPath || `C:\\Users\\${outputPath}`;
                    const fullPath = prompt(
                        `您选择了文件夹: ${outputPath}\n\n由于浏览器安全限制，请输入该文件夹的完整路径:\n(下次选择相同文件夹将自动使用此路径)`,
                        defaultPath
                    );
                    if (fullPath && fullPath.trim()) {
                        finalOutputPath = fullPath.trim();
                        // 保存完整路径，24小时内有效
                        localStorage.setItem(`autozip_full_path_${outputPath}`, finalOutputPath);
                        localStorage.setItem(`autozip_full_path_time_${outputPath}`, Date.now().toString());
                    }
                }
            } catch (error) {
                console.warn('无法获取完整路径，使用用户输入:', error);
            }
        }
        
        // 发送打包请求
        const response = await fetch('/api/pack', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                output_path: finalOutputPath
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 开始轮询状态
            startStatusPolling();
        } else {
            throw new Error(result.message || '打包请求失败');
        }
        
    } catch (error) {
        console.error('打包错误:', error);
        showMessage(`打包失败: ${error.message}`, 'error');
        updateStatus('打包失败', 'error', 0);
        isPackaging = false;
        updatePackButtonState();
    }
}

// 开始状态轮询
function startStatusPolling() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    statusCheckInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            updateStatus(status.message, status.status, status.progress);
            
            // 检查是否完成
            if (status.status === 'success') {
                showMessage(`打包成功！文件已保存到: ${outputPathInput.value}`, 'success');
                stopStatusPolling();
            } else if (status.status === 'error') {
                showMessage(`打包失败: ${status.message}`, 'error');
                stopStatusPolling();
            }
            
        } catch (error) {
            console.error('状态检查错误:', error);
            showMessage('状态检查失败', 'error');
            stopStatusPolling();
        }
    }, 500); // 每500ms检查一次状态
}

// 停止状态轮询
function stopStatusPolling() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
    isPackaging = false;
    updatePackButtonState();
}

// 更新状态显示
function updateStatus(message, status, progress) {
    statusText.textContent = message;
    
    // 移除所有状态类
    statusText.classList.remove('error', 'packing');
    
    // 添加对应的状态类
    if (status === 'error') {
        statusText.classList.add('error');
    } else if (status === 'packing') {
        statusText.classList.add('packing');
    }
    
    // 更新进度条
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;
}

// 显示消息
function showMessage(message, type) {
    resultMessage.textContent = message;
    resultMessage.className = `result-message ${type}`;
    resultMessage.style.display = 'block';
    
    // 自动隐藏成功消息
    if (type === 'success') {
        setTimeout(() => {
            hideMessage();
        }, 5000);
    }
}

// 隐藏消息
function hideMessage() {
    resultMessage.style.display = 'none';
    resultMessage.className = 'result-message';
}

// 页面卸载时清理
window.addEventListener('beforeunload', function() {
    stopStatusPolling();
});

// 错误处理
window.addEventListener('error', function(event) {
    console.error('JavaScript错误:', event.error);
    showMessage('程序出现错误，请刷新页面重试', 'error');
});

// 网络错误处理
window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise错误:', event.reason);
    showMessage('网络请求失败，请检查连接', 'error');
});

// 关闭应用程序
async function shutdownApplication() {
    if (confirm('确定要关闭程序吗？这将停止服务器并释放端口。')) {
        try {
            // 停止状态轮询
            stopStatusPolling();
            
            // 显示关闭消息
            showMessage('正在关闭程序...', 'error');
            updateStatus('正在关闭服务器...', 'error', 100);
            
            // 发送关闭请求
            await fetch('/api/shutdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            // 延迟一下再关闭页面，确保请求发送成功
            setTimeout(() => {
                window.close();
                // 如果无法关闭窗口，显示提示
                setTimeout(() => {
                    document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-size: 18px; color: #666;">程序已关闭，您可以关闭此页面</div>';
                }, 1000);
            }, 1000);
            
        } catch (error) {
            console.error('关闭程序错误:', error);
            showMessage('关闭程序失败，请手动关闭终端', 'error');
        }
    }
}