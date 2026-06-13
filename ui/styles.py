def get_main_style():
    return """
        QMainWindow {
            background-color: #0F172A;
        }
        QWidget {
            color: #F8FAFC;
            font-family: 'Segoe UI', Arial, sans-serif;
        }
        /* ===== SCROLLBAR ===== */
        QScrollBar:vertical {
            background: #0F172A;
            width: 8px;
            border-radius: 4px;
            margin: 4px 2px 4px 2px;
        }
        QScrollBar::handle:vertical {
            background: #334155;
            border-radius: 4px;
            min-height: 40px;
        }
        QScrollBar::handle:vertical:hover {
            background: #38BDF8;
        }
        QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
            height: 0px;
        }
        QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {
            background: none;
        }
        QScrollBar:horizontal {
            background: #0F172A;
            height: 8px;
            border-radius: 4px;
            margin: 2px 4px 2px 4px;
        }
        QScrollBar::handle:horizontal {
            background: #334155;
            border-radius: 4px;
            min-width: 40px;
        }
        QScrollBar::handle:horizontal:hover {
            background: #38BDF8;
        }
        QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {
            width: 0px;
        }
        QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal {
            background: none;
        }
        /* ===== SIDEBAR ===== */
        QFrame#Sidebar {
            background-color: #111827;
            border-right: 1px solid #1E293B;
        }
        QFrame#Header {
            background-color: #111827;
            border-bottom: 1px solid #1E293B;
        }
        /* ===== STAT CARDS — chỉ viền cha ===== */
        QFrame#Card {
            background-color: #1E293B;
            border-radius: 12px;
            border: 1px solid #334155;
        }
        QFrame#Card:hover {
            border: 1px solid #38BDF8;
        }
        /* ===== BUTTONS ===== */
        QPushButton#SidebarBtn {
            background-color: transparent;
            border: none;
            color: #94A3B8;
            text-align: left;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
        }
        QPushButton#SidebarBtn:hover {
            background-color: #1E293B;
            color: #38BDF8;
        }
        QPushButton#SidebarBtn:checked {
            background-color: #38BDF8;
            color: #0F172A;
        }
        QPushButton#PrimaryBtn {
            background-color: #38BDF8;
            color: #0F172A;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
        }
        QPushButton#PrimaryBtn:hover {
            background-color: #7DD3FC;
        }
        /* ===== INPUTS — text màu sáng, no border glow hijack ===== */
        QLineEdit {
            background-color: #1E293B;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 10px;
            color: #F8FAFC;
            font-size: 14px;
        }
        QLineEdit:focus {
            border: 1px solid #38BDF8;
        }
        QTextEdit {
            background-color: #1E293B;
            border: 1px solid #334155;
            border-radius: 6px;
            color: #F8FAFC;
            padding: 10px;
        }
        QComboBox {
            background-color: #1E293B;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 8px 12px;
            color: #F8FAFC;
            font-size: 13px;
            cursor: pointer;
        }
        QComboBox:focus {
            border: 1px solid #38BDF8;
        }
        QComboBox QAbstractItemView {
            background-color: #1E293B;
            color: #F8FAFC;
            selection-background-color: #38BDF8;
            selection-color: #0F172A;
            outline: none;
        }
        QComboBox QAbstractItemView::item {
            cursor: pointer;
        }
        /* ===== GENERAL BUTTONS — pointer cursor mặc định ===== */
        QPushButton {
            cursor: pointer;
        }
        /* ===== LABELS ===== */
        QLabel#Title {
            font-size: 22px;
            font-weight: bold;
            color: #F8FAFC;
        }
        QLabel#Subtitle {
            font-size: 14px;
            color: #94A3B8;
        }
        /* ===== TABLE ===== */
        QTableWidget {
            background-color: #1E293B;
            border: none;
            gridline-color: #334155;
        }
        QHeaderView::section {
            background-color: #111827;
            color: #94A3B8;
            padding: 8px;
            border: none;
            font-weight: bold;
        }
        /* ===== PROGRESS ===== */
        QProgressBar {
            border: 1px solid #334155;
            border-radius: 4px;
            text-align: center;
            background-color: #0F172A;
            color: #F8FAFC;
        }
        QProgressBar::chunk {
            background-color: #38BDF8;
            border-radius: 4px;
        }
        /* ===== MESSAGE BOX — dialog text sáng ===== */
        QMessageBox {
            background-color: #1E293B;
            color: #F8FAFC;
        }
        QMessageBox QLabel {
            color: #F8FAFC;
            font-size: 13px;
        }
        QMessageBox QPushButton {
            background-color: #334155;
            color: #F8FAFC;
            border: 1px solid #475569;
            padding: 6px 20px;
            border-radius: 4px;
            font-weight: bold;
            min-width: 70px;
        }
        QMessageBox QPushButton:hover {
            background-color: #38BDF8;
            color: #0F172A;
            border: 1px solid #38BDF8;
        }
        /* ===== INPUT DIALOG ===== */
        QInputDialog {
            background-color: #1E293B;
            color: #F8FAFC;
        }
        QInputDialog QLabel {
            color: #F8FAFC;
        }
        QDialog {
            background-color: #1E293B;
            color: #F8FAFC;
        }
        QDialog QLabel {
            color: #F8FAFC;
        }
        QDialog QPushButton {
            background-color: #334155;
            color: #F8FAFC;
            border: 1px solid #475569;
            padding: 6px 20px;
            border-radius: 4px;
            font-weight: bold;
        }
        QDialog QPushButton:hover {
            background-color: #38BDF8;
            color: #0F172A;
        }
        /* ===== TOOLTIP ===== */
        QToolTip {
            background-color: #0F172A;
            color: #F8FAFC;
            border: 1px solid #334155;
            padding: 4px 8px;
            border-radius: 4px;
        }
    """


# ===== Style dùng riêng cho QMessageBox (Info / Warning / Critical / Question) =====
# QMessageBox không kế thừa đầy đủ theme toàn cục trên một số nền tảng (đặc biệt Windows),
# nên cần style trực tiếp để đồng bộ nền tối + chữ trắng với toàn bộ ứng dụng.
MESSAGEBOX_STYLE = """
    QMessageBox {
        background-color: #1E293B;
    }
    QMessageBox QLabel {
        color: #F8FAFC;
        font-size: 13px;
    }
    QMessageBox QPushButton {
        background-color: #334155;
        color: #F8FAFC;
        border: 1px solid #475569;
        padding: 6px 20px;
        border-radius: 4px;
        font-weight: bold;
        min-width: 70px;
    }
    QMessageBox QPushButton:hover {
        background-color: #38BDF8;
        color: #0F172A;
    }
    QMessageBox QPushButton:default {
        background-color: #38BDF8;
        color: #0F172A;
        border: 1px solid #38BDF8;
    }
"""
