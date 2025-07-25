# LaochenAutoZIP

English | [中文](README.md)

**Perfect Backup for Every AI Code Iteration**

An intelligent backup tool specifically designed for AI code development, ensuring every code iteration has a complete backup record.

## Features

- **🚀 One-Click Backup**: Select a folder and quickly backup to ZIP file
- **🧠 Smart Numbering**: Automatically detects existing backups, generates incremental numbers, never overwrites
- **📱 Modern Interface**: Clean and beautiful web interface, intuitive operation
- **💾 Path Memory**: Intelligently remembers frequently used paths, no need to re-enter within 24 hours
- **🛡️ Smart Filtering**: Automatically excludes irrelevant files, only backs up important code
- **⚡ Portable**: Single executable file, works in any directory

## Quick Start

### Download and Use

1. Download the `LaochenAutoZIP.exe` file
2. Copy the program to your AI code project directory
3. Double-click to run the program
4. The program will automatically open the web interface
5. Select backup output path
6. Click "Start Packaging" to begin backup

### Build from Source

If you want to build the program from source code, follow these steps:

#### Environment Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install PyInstaller
pip install pyinstaller
```

#### Build Steps
```bash
# Build using configuration file
python -m PyInstaller LaochenAutoZIP.spec

# After building, the executable is located in the dist directory
# You can rename dist/LaochenAutoZIP.exe as needed
```

#### Build Configuration
- Build config file: `LaochenAutoZIP.spec`
- Main program file: `app.py`
- Static resources: `static/` and `templates/` folders
- Program icon: `Icon.ico`
- Output directory: `dist/LaochenAutoZIP.exe`

## User Guide

### Basic Operation Flow

1. **Start Program**
   - Double-click `LaochenAutoZIP.exe`
   - The program will automatically open the interface in your browser

2. **Select Output Path**
   - Click the folder icon to open system file selector
   - Or click the input box to manually enter path
   - The program will remember your choice and auto-restore next time

3. **Start Backup**
   - Click "Start Packaging" button
   - View backup progress in real-time
   - Result file location will be displayed when backup completes

### Smart Features

#### 🔢 Automatic Numbering System
The program intelligently detects existing backup files in the output directory:
- First backup: `backup_001.zip`
- Second backup: `backup_002.zip`
- Third backup: `backup_003.zip`
- And so on, never overwrites old backups

#### 🧠 Path Memory Function
- Automatically remembers your selected folder paths
- No need to re-enter the same path within 24 hours
- Supports memory of multiple different paths

#### 🛡️ Smart Filtering Rules
**Automatically Includes:**
- All source code files
- Configuration files and documentation
- Project-related resource files

**Automatically Excludes:**
- Program's own files
- Temporary files and cache
- Version control directories (`.git`, `.svn`)
- Build output directories (`dist`, `build`, `node_modules`)
- System temporary files

## Use Cases

- **AI Model Training**: Backup code state before each parameter tuning
- **Algorithm Development**: Complete records of important algorithm iterations
- **Project Milestones**: Code snapshots after completing key features
- **Experiment Records**: Code preservation for different experiment versions
- **Team Collaboration**: Regular backups of personal development branches

## System Requirements

- **Operating System**: Windows 7/8/10/11
- **Memory**: Minimum 256MB RAM
- **Disk Space**: Minimum 20MB available space
- **Browser**: Any modern browser (program opens automatically)

## FAQ

**Q: What if the program won't start?**
A: Please check if it's being flagged by antivirus software. Add the program to the whitelist.

**Q: What if backup is slow?**
A: Backup speed depends on file count and size. Regularly clean unnecessary temporary files.

**Q: Can I backup to cloud storage?**
A: Yes, select a cloud sync folder as the output path for automatic cloud backup.

**Q: How to restore backups?**
A: Simply extract the corresponding ZIP file to restore to any location.

---

**LaochenAutoZIP** - Making AI code development more secure, ensuring every innovation is traceable.