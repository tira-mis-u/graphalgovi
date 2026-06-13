import sys
import os
import json
import subprocess
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from ui.main_window import MainWindow
REQUIRED_MODULES = {
    "PySide6": "PySide6",
    "qtawesome": "qtawesome",
    "requests": "requests",
    "bs4": "beautifulsoup4",
    "whois": "python-whois",
    "tldextract": "tldextract"
}

def check_and_install_dependencies():
    missing_packages = []
    for module_name, package_name in REQUIRED_MODULES.items():
        try:
            __import__(module_name)
        except ImportError:
            missing_packages.append(package_name)
            
    if missing_packages:
        print(f"[*] Đang cài đặt thư viện thiếu: {', '.join(missing_packages)}...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", *missing_packages])
        except Exception as e:
            sys.exit(1)

check_and_install_dependencies()

from database.db_manager import DatabaseManager
from ui.main_window import MainWindow

def load_ui_text():
    # Đọc tiêu đề cửa sổ trực tiếp từ cấu hình tập trung bên ngoài
    path = "config/ui_text.json"
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return {"window_title": "CyberShield Việt Nam"}

def main():
    app = QApplication(sys.argv)
    
    db = DatabaseManager()
    ui_strings = load_ui_text()
    
    window = MainWindow(db)
    window.setWindowTitle(ui_strings.get("window_title", "CyberShield Việt Nam"))
    
    # RÀ SOÁT KÍCH THƯỚC: Lấy thông số màn hình thực tế và khóa chặt chế độ Maximized
    screen_geometry = app.primaryScreen().geometry()
    window.setMinimumSize(screen_geometry.width(), screen_geometry.height())
    window.setWindowFlags(window.windowFlags() | Qt.WindowMinMaxButtonsHint)
    window.showMaximized()
    
    sys.exit(app.exec())

if __name__ == '__main__':
    main()