import os
import sys
import zipfile
import re
import webbrowser
import threading
import time
from flask import Flask, render_template, request, jsonify
from werkzeug.serving import make_server
import socket

app = Flask(__name__)

# 全局变量
pack_status = {
    'status': 'ready',  # ready, packing, success, error
    'message': '准备就绪',
    'progress': 0
}

# 全局服务器实例
server_instance = None

def get_resource_path(relative_path):
    """获取资源文件路径，兼容PyInstaller打包"""
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

def find_available_port(start_port=5000, max_attempts=10):
    """寻找可用端口"""
    for port in range(start_port, start_port + max_attempts):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('localhost', port))
            sock.close()
            return port
        except OSError:
            continue
    return None

def get_next_backup_number(output_path):
    """获取下一个备份编号"""
    if not os.path.exists(output_path):
        return 1
    
    zip_files = [f for f in os.listdir(output_path) if f.endswith('.zip')]
    numbers = []
    
    for filename in zip_files:
        # 匹配 backup_xxx.zip 格式
        match = re.search(r'backup_(\d+)\.zip$', filename)
        if match:
            numbers.append(int(match.group(1)))
    
    return max(numbers) + 1 if numbers else 1

def get_current_exe_name():
    """获取当前可执行文件名"""
    if hasattr(sys, 'frozen'):
        return os.path.basename(sys.executable)
    return None

def create_zip_package(source_dir, output_path, exclude_files=None):
    """创建ZIP压缩包"""
    global pack_status
    
    try:
        pack_status['status'] = 'packing'
        pack_status['message'] = '正在扫描文件...'
        pack_status['progress'] = 10
        
        # 获取下一个编号
        next_number = get_next_backup_number(output_path)
        zip_filename = f"backup_{next_number:03d}.zip"
        zip_path = os.path.join(output_path, zip_filename)
        
        pack_status['message'] = f'正在创建 {zip_filename}...'
        pack_status['progress'] = 20
        
        # 获取当前exe文件名用于排除
        exe_name = get_current_exe_name()
        
        # 默认排除文件
        default_excludes = {
            '.tmp', '.log', '.pyc', '__pycache__',
            'Thumbs.db', '.DS_Store'
        }
        
        if exclude_files:
            default_excludes.update(exclude_files)
        
        if exe_name:
            default_excludes.add(exe_name)
        
        # 收集所有文件
        all_files = []
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, source_dir)
                
                # 检查是否需要排除
                should_exclude = False
                for exclude in default_excludes:
                    if exclude in file or exclude in rel_path:
                        should_exclude = True
                        break
                
                if not should_exclude:
                    all_files.append((file_path, rel_path))
        
        pack_status['message'] = f'正在压缩 {len(all_files)} 个文件...'
        pack_status['progress'] = 30
        
        # 创建ZIP文件
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for i, (file_path, rel_path) in enumerate(all_files):
                try:
                    zipf.write(file_path, rel_path)
                    progress = 30 + int((i + 1) / len(all_files) * 60)
                    pack_status['progress'] = progress
                    pack_status['message'] = f'正在压缩: {rel_path}'
                except Exception as e:
                    print(f"警告: 无法压缩文件 {file_path}: {e}")
        
        pack_status['status'] = 'success'
        pack_status['message'] = f'打包完成: {zip_filename}'
        pack_status['progress'] = 100
        
        return True, zip_filename
        
    except Exception as e:
        pack_status['status'] = 'error'
        pack_status['message'] = f'打包失败: {str(e)}'
        pack_status['progress'] = 0
        return False, str(e)

@app.route('/')
def index():
    """主页面"""
    return render_template('index.html')

@app.route('/api/pack', methods=['POST'])
def pack_files():
    """执行打包操作"""
    try:
        data = request.get_json()
        output_path = data.get('output_path')
        
        if not output_path:
            return jsonify({
                'success': False,
                'message': '请选择输出路径'
            })
        
        if not os.path.exists(output_path):
            return jsonify({
                'success': False,
                'message': '输出路径不存在'
            })
        
        # 获取当前程序所在目录
        if hasattr(sys, 'frozen'):
            source_dir = os.path.dirname(sys.executable)
        else:
            source_dir = os.path.dirname(os.path.abspath(__file__))
        
        # 在后台线程中执行打包
        def pack_thread():
            create_zip_package(source_dir, output_path)
        
        threading.Thread(target=pack_thread, daemon=True).start()
        
        return jsonify({
            'success': True,
            'message': '开始打包...'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'操作失败: {str(e)}'
        })

@app.route('/api/status', methods=['GET'])
def get_status():
    """获取打包状态"""
    return jsonify(pack_status)

@app.route('/api/shutdown', methods=['POST'])
def shutdown_server():
    """关闭服务器"""
    global server_instance
    try:
        if server_instance:
            # 在新线程中关闭服务器，避免阻塞响应
            def shutdown():
                time.sleep(0.5)  # 给响应时间发送
                server_instance.shutdown()
            
            threading.Thread(target=shutdown, daemon=True).start()
            
            return jsonify({
                'success': True,
                'message': '服务器正在关闭...'
            })
        else:
            return jsonify({
                'success': False,
                'message': '服务器实例未找到'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'关闭失败: {str(e)}'
        })

def open_browser(port):
    """延迟打开浏览器"""
    time.sleep(1.5)  # 等待服务器启动
    webbrowser.open(f'http://localhost:{port}')

def main():
    """主函数"""
    global server_instance
    
    # 寻找可用端口
    port = find_available_port()
    if not port:
        print("错误: 无法找到可用端口")
        input("按回车键退出...")
        return
    
    print(f"老陈AutoZIP 启动中...")
    print(f"老陈AutoZIP 服务地址: http://localhost:{port}")
    
    # 在后台线程中打开浏览器
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    
    try:
        # 创建服务器
        server_instance = make_server('localhost', port, app, threaded=True)
        print("服务器已启动，按 Ctrl+C 退出")
        server_instance.serve_forever()
    except KeyboardInterrupt:
        print("\n正在关闭服务器...")
    except Exception as e:
        print(f"服务器错误: {e}")
        input("按回车键退出...")

if __name__ == '__main__':
    main()