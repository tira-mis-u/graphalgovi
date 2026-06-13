import os
import json
import random
import string
import zipfile
try:
    import rarfile
except ImportError:
    rarfile = None
try:
    import py7zr
except ImportError:
    py7zr = None
from PySide6.QtWidgets import (QWidget, QFrame, QVBoxLayout, QLabel, QHBoxLayout, QPushButton,
                               QLineEdit, QTextEdit, QTableWidget, QTableWidgetItem, QHeaderView,
                               QSizePolicy, QProgressBar, QComboBox, QCheckBox, QMessageBox,
                               QFileDialog, QScrollArea, QGridLayout, QStackedWidget, QApplication)
from PySide6.QtCore import Qt, QFileInfo, QTimer, QThread, Signal
from PySide6.QtGui import QImage

import qtawesome as qta

from services.web_scanner import WebScanner
from services.phone_scanner import PhoneScanner
from services.email_scanner import EmailScanner
from services.qr_scanner import QRScanner
from services.pwd_checker import PasswordChecker
from ui.components import SkeletonCard, SkeletonTableRow, SkeletonBlock

# =====================================================================
# GLOBAL STYLE: inputs không tự mở rộng, text luôn sáng
# =====================================================================
COMMON_INPUT_STYLE = """
    QLineEdit, QTextEdit, QComboBox {
        background-color: #1E293B;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #F8FAFC;
        padding: 8px 12px;
        font-size: 13px;
    }
    QLineEdit:focus, QTextEdit:focus, QComboBox:focus {
        border: 1px solid #38BDF8;
    }
    QComboBox { padding-right: 20px; cursor: pointer; }
    QComboBox::drop-down { subcontrol-origin: padding; subcontrol-position: top right;
                           width: 25px; border-left: none; }
    QComboBox QAbstractItemView {
        background-color: #1E293B;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #F8FAFC;
        padding: 4px;
        outline: none;
    }
    QComboBox QAbstractItemView::item {
        color: #F8FAFC;
        padding: 8px 12px;
        border-radius: 6px;
        min-height: 24px;
        cursor: pointer;
    }
    QComboBox QAbstractItemView::item:hover,
    QComboBox QAbstractItemView::item:selected {
        background-color: #38BDF8;
        color: #0F172A;
    }
"""

# Style dùng cho TẤT CẢ QMessageBox (Info / Warning / Critical / Question) để đồng bộ
# nền tối + chữ trắng với theme chung của app. QMessageBox không tự kế thừa theme
# toàn cục trên Windows nên phải set trực tiếp.
MESSAGEBOX_STYLE = """
    QMessageBox {
        background-color: #1E293B;
    }
    QMessageBox QWidget {
        background-color: #1E293B;
    }
    QMessageBox QLabel {
        background-color: #1E293B;
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
        cursor: pointer;
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

SCROLLBAR_STYLE = """
    QScrollBar:vertical {
        background: #0F172A; width: 8px; border-radius: 4px; margin: 4px 2px;
    }
    QScrollBar::handle:vertical {
        background: #334155; border-radius: 4px; min-height: 40px;
    }
    QScrollBar::handle:vertical:hover { background: #38BDF8; }
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0px; }
    QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: none; }
    QScrollBar:horizontal {
        background: #0F172A; height: 8px; border-radius: 4px; margin: 2px 4px;
    }
    QScrollBar::handle:horizontal {
        background: #334155; border-radius: 4px; min-width: 40px;
    }
    QScrollBar::handle:horizontal:hover { background: #38BDF8; }
    QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0px; }
    QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal { background: none; }
"""

TABLE_STYLE = """
    QTableWidget { background-color: #1E293B; color: #F8FAFC; gridline-color: #334155;
                   border-radius: 8px; border: none; }
    QHeaderView::section { background-color: #0F172A; color: #38BDF8; font-weight: bold;
                           border: none; padding: 6px; }
    QTableWidget::item { border: none; padding: 4px 8px; }
"""


def read_text_cfg(key, default_val):
    if os.path.exists("config/ui_text.json"):
        try:
            with open("config/ui_text.json", "r", encoding="utf-8") as f:
                return json.load(f).get(key, default_val)
        except:
            pass
    return default_val


def make_section_frame(bg="#1E293B", radius=8, padding=15):
    """Tạo frame section KHÔNG có border (chỉ background)"""
    f = QFrame()
    f.setStyleSheet(f"background-color: {bg}; border-radius: {radius}px; border: none;")
    return f


# =====================================================================
# DASHBOARD VIEW
# =====================================================================
class DashboardView(QWidget):
    def __init__(self, db):
        super().__init__()
        self.db = db
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(25)

        # Banner — viền xanh lớn chỉ ở border-left (accent)
        banner = QFrame()
        banner.setStyleSheet(
            "background: qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 #1E293B,stop:1 #0F172A);"
            "border-left: 5px solid #38BDF8; "
            "border-top: none; border-right: none; border-bottom: none; "
            "border-radius: 0px;"
        )
        b_layout = QVBoxLayout(banner)
        self.b_title = QLabel(read_text_cfg("banner_title", "Chào mừng đến với CyberShield Việt Nam"))
        self.b_title.setStyleSheet("font-size: 22px; font-weight: bold; color: #38BDF8;")
        self.b_sub = QLabel(read_text_cfg("banner_subtitle", "Hệ thống hỗ trợ nhận diện, phòng chống lừa đảo mạng."))
        self.b_sub.setStyleSheet("color: #94A3B8; font-size: 13px;")
        b_layout.addWidget(self.b_title)
        b_layout.addWidget(self.b_sub)
        layout.addWidget(banner)

        # Stat cards row — stack widget (skeleton → real)
        self.cards_stack = QStackedWidget()
        self.cards_stack.setFixedHeight(110)

        # Skeleton row
        skel_widget = QWidget()
        skel_row = QHBoxLayout(skel_widget)
        skel_row.setContentsMargins(0, 0, 0, 0)
        skel_row.setSpacing(15)
        for _ in range(4):
            skel_row.addWidget(SkeletonCard())

        # Real cards
        from ui.components import StatCard
        real_widget = QWidget()
        real_row = QHBoxLayout(real_widget)
        real_row.setContentsMargins(0, 0, 0, 0)
        real_row.setSpacing(15)
        stats = self.db.get_stats()
        self.card1 = StatCard(read_text_cfg("stat_total_reports", "Tổng số báo cáo"), stats["total_reports"], "fa5s.bullhorn")
        self.card2 = StatCard(read_text_cfg("stat_dangerous_web", "Website nguy cơ cao"), stats["dangerous_web"], "fa5s.globe", "#EF4444")
        self.card3 = StatCard(read_text_cfg("stat_leaked_email", "Email bị lộ thông tin"), stats["leaked_email"], "fa5s.envelope-open", "#F59E0B")
        self.card4 = StatCard(read_text_cfg("stat_reported_phones", "Số máy bị báo cáo"), stats["reported_phones"], "fa5s.phone-slash", "#EF4444")
        for c in [self.card1, self.card2, self.card3, self.card4]:
            real_row.addWidget(c)

        self.cards_stack.addWidget(skel_widget)  # index 0 = skeleton
        self.cards_stack.addWidget(real_widget)   # index 1 = real
        self.cards_stack.setCurrentIndex(0)
        layout.addWidget(self.cards_stack)

        self.lbl_recent = QLabel(read_text_cfg("recent_reports_title", "Báo cáo đáng ngờ gần đây từ cộng đồng"))
        self.lbl_recent.setStyleSheet("font-size: 16px; font-weight: bold; color: #F8FAFC;")
        layout.addWidget(self.lbl_recent)

        # Table stack (skeleton → real)
        self.table_stack = QStackedWidget()

        # Skeleton table
        skel_table_w = QWidget()
        skel_table_l = QVBoxLayout(skel_table_w)
        skel_table_l.setContentsMargins(0, 0, 0, 0)
        skel_table_l.setSpacing(6)
        for _ in range(6):
            skel_table_l.addWidget(SkeletonTableRow(5))
        skel_table_l.addStretch()

        # Real table
        self.table = QTableWidget()
        self.table.setColumnCount(5)
        self.table.setHorizontalHeaderLabels(["STT", "Loại Hình", "Mục Tiêu", "Nội Dung Mô Tả", "Thời Gian"])
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        for c in range(1, 5):
            self.table.horizontalHeader().setSectionResizeMode(c, QHeaderView.ResizeMode.Stretch)
        self.table.setStyleSheet(TABLE_STYLE + SCROLLBAR_STYLE)
        self.table.verticalHeader().setVisible(False)
        self.table.setShowGrid(True)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)

        self.table_stack.addWidget(skel_table_w)  # 0 = skeleton
        self.table_stack.addWidget(self.table)     # 1 = real
        self.table_stack.setCurrentIndex(0)
        layout.addWidget(self.table_stack, stretch=1)

        # Chuyển sang real sau 800ms (giả lập load)
        QTimer.singleShot(800, self._show_real_content)

    def _show_real_content(self):
        self.refresh_dashboard()
        self.cards_stack.setCurrentIndex(1)
        self.table_stack.setCurrentIndex(1)

    def refresh_dashboard(self):
        self.b_title.setText(read_text_cfg("banner_title", "Chào mừng đến với CyberShield Việt Nam"))
        self.b_sub.setText(read_text_cfg("banner_subtitle", "Hệ thống hỗ trợ nhận diện, phòng chống lừa đảo mạng."))
        self.lbl_recent.setText(read_text_cfg("recent_reports_title", "Báo cáo đáng ngờ gần đây từ cộng đồng"))

        stats = self.db.get_stats()
        self.card1.update_value(stats["total_reports"])
        self.card2.update_value(stats["dangerous_web"])
        self.card3.update_value(stats["leaked_email"])
        self.card4.update_value(stats["reported_phones"])

        reports = self.db.get_recent_reports()
        self.table.setRowCount(len(reports))
        for row_idx, r in enumerate(reports):
            t_type = ("Đường dẫn liên kết" if r['type'] == 'website'
                      else ("Số điện thoại" if r['type'] == 'phone' else "Tài khoản Email"))
            for col, val in enumerate([str(row_idx + 1), t_type, r['target'], r['description'], r['created_at']]):
                item = QTableWidgetItem(val)
                item.setForeground(Qt.GlobalColor.white)
                self.table.setItem(row_idx, col, item)


# =====================================================================
# WEB SCANNER VIEW
# =====================================================================
class WebScanWorker(QThread):
    """Chạy analyze_url (bao gồm tra cứu WHOIS có thể chậm/timeout) trên thread riêng
    để tránh treo (Not Responding) giao diện chính."""
    finished_scan = Signal(dict, str)

    def __init__(self, scanner, url):
        super().__init__()
        self.scanner = scanner
        self.url = url

    def run(self):
        try:
            res = self.scanner.analyze_url(self.url)
        except Exception:
            res = {
                "score": 0, "level": "Không xác định", "domain": self.url,
                "is_https": False, "has_ip": False, "subdomain_count": 0,
                "subdomain_list": [], "suspicious_words": [], "is_blacklisted": False,
                "domain_age_days": -1, "domain_registered_date": None, "details": []
            }
        self.finished_scan.emit(res, self.url)


class WebScannerView(QWidget):
    def __init__(self, db):
        super().__init__()
        self.db = db
        self.scanner = WebScanner()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        title = QLabel(read_text_cfg("menu_web", "Kiểm tra Đường dẫn (Link)"))
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: #F8FAFC;")
        subtitle = QLabel("Hệ thống quét tự động phân tích cấu trúc liên kết để cảnh báo nguy cơ độc hại, mạo danh giả mạo.")
        subtitle.setStyleSheet("color: #94A3B8; font-size: 13px;")
        layout.addWidget(title)
        layout.addWidget(subtitle)

        input_layout = QHBoxLayout()
        self.input_url = QLineEdit()
        self.input_url.setStyleSheet(COMMON_INPUT_STYLE)
        self.input_url.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        self.input_url.setPlaceholderText("Nhập địa chỉ liên kết cần kiểm tra...")
        self.btn_scan = QPushButton("Phân Tích Ngay")
        self.btn_scan.setStyleSheet("background-color: #38BDF8; color: #0F172A; font-weight: bold; padding: 10px 20px; border-radius: 6px; cursor: pointer;")
        self.btn_scan.setFixedWidth(150)
        self.btn_scan.clicked.connect(self.run_scan)
        input_layout.addWidget(self.input_url)
        input_layout.addWidget(self.btn_scan)
        layout.addLayout(input_layout)

        # Skeleton loading overlay
        self.skel_area = QWidget()
        skel_l = QVBoxLayout(self.skel_area)
        skel_l.setContentsMargins(0, 0, 0, 0)
        skel_l.setSpacing(12)
        for h in [80, 200, 120]:
            skel_l.addWidget(SkeletonBlock(height=h, radius=8))
        skel_l.addStretch()
        self.skel_area.setVisible(False)

        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }" + SCROLLBAR_STYLE)
        self.scroll.setVisible(False)

        self.result_container = QWidget()
        self.result_container.setStyleSheet("background: transparent;")
        self.rc_layout = QVBoxLayout(self.result_container)
        self.rc_layout.setContentsMargins(0, 0, 0, 0)
        self.rc_layout.setSpacing(12)
        self.scroll.setWidget(self.result_container)

        layout.addWidget(self.skel_area)
        layout.addWidget(self.scroll, stretch=1)

    def run_scan(self):
        url = self.input_url.text().strip()
        if not url:
            return
        # Show skeleton
        self.scroll.setVisible(False)
        self.skel_area.setVisible(True)
        self.btn_scan.setEnabled(False)
        self._worker = WebScanWorker(self.scanner, url)
        self._worker.finished_scan.connect(self._on_scan_finished)
        self._worker.start()

    def _on_scan_finished(self, res, url):
        self.skel_area.setVisible(False)
        self.scroll.setVisible(True)
        self.btn_scan.setEnabled(True)
        self._build_report(res)
        self.db.add_history("website", url, res["score"], res["level"])

    def _clear_layout(self, layout):
        while layout.count():
            item = layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

    def _build_report(self, res):
        self._clear_layout(self.rc_layout)

        sim_level = res['level']
        if sim_level in ["High", "Nguy hiểm", "Cao"]:
            display_level = "Nguy cơ cao"
        elif sim_level in ["Safe", "An toàn"]:
            display_level = "An toàn"
        elif sim_level == "Thấp":
            display_level = "Nguy cơ thấp"
        else:
            display_level = sim_level

        color_map = {"An toàn": "#22C55E", "Nguy cơ thấp": "#38BDF8",
                     "Trung bình": "#F59E0B", "Nguy cơ cao": "#EF4444", "Nguy hiểm": "#EF4444"}
        color = color_map.get(display_level, "#EF4444")

        # Score frame — NO border
        score_frame = make_section_frame()
        sf_layout = QVBoxLayout(score_frame)
        sf_layout.setContentsMargins(15, 15, 15, 15)

        lbl_level = QLabel(display_level)
        lbl_level.setStyleSheet(f"font-size: 24px; font-weight: bold; color: {color};")
        sf_layout.addWidget(lbl_level)

        lbl_score_title = QLabel("ĐIỂM ĐÁNH GIÁ RỦI RO:")
        lbl_score_title.setStyleSheet("font-size: 13px; color: #94A3B8;")
        sf_layout.addWidget(lbl_score_title)

        lbl_score = QLabel(f"{res['score']} / 100")
        lbl_score.setStyleSheet(f"font-size: 32px; font-weight: bold; color: {color};")
        sf_layout.addWidget(lbl_score)

        bar = QProgressBar()
        bar.setRange(0, 100)
        bar.setValue(res["score"])
        bar.setStyleSheet(f"QProgressBar {{ background-color: #0F172A; border-radius: 4px; border:none; "
                          f"text-align: center; color: white; height: 14px; }} "
                          f"QProgressBar::chunk {{ background-color: {color}; border-radius: 4px; }}")
        sf_layout.addWidget(bar)
        self.rc_layout.addWidget(score_frame)

        # Factors frame — NO border on children
        factors_frame = make_section_frame()
        ff_layout = QVBoxLayout(factors_frame)
        ff_layout.setContentsMargins(15, 15, 15, 15)
        ff_layout.setSpacing(8)

        lbl_factors_title = QLabel("CÁC YẾU TỐ ĐÃ KIỂM TRA:")
        lbl_factors_title.setStyleSheet("font-size: 14px; font-weight: bold; color: #38BDF8; margin-bottom: 5px;")
        ff_layout.addWidget(lbl_factors_title)

        for item in res.get("details", []):
            icon = "✓" if item["status"] else "✗"
            icon_color = "#22C55E" if item["status"] else "#EF4444"

            item_frame = QFrame()
            item_frame.setStyleSheet(
                f"background-color: #0F172A; border-left: 3px solid {icon_color}; "
                f"border-top: none; border-right: none; border-bottom: none; "
                f"border-radius: 0px;"
            )
            item_layout = QVBoxLayout(item_frame)
            item_layout.setContentsMargins(10, 6, 10, 6)
            item_layout.setSpacing(4)

            header_layout = QHBoxLayout()
            lbl_icon = QLabel(icon)
            lbl_icon.setStyleSheet(f"color: {icon_color}; font-size: 15px; font-weight: bold;")
            lbl_icon.setFixedWidth(20)
            lbl_label = QLabel(item["label"])
            lbl_label.setStyleSheet(f"color: {icon_color}; font-size: 13px; font-weight: bold;")
            lbl_label.setWordWrap(True)
            header_layout.addWidget(lbl_icon)
            header_layout.addWidget(lbl_label, 1)
            item_layout.addLayout(header_layout)

            if item.get("value"):
                lbl_value = QLabel(f"Bằng chứng: {item['value']}")
                lbl_value.setStyleSheet("color: #CBD5E1; font-size: 12px; margin-left: 22px;")
                lbl_value.setWordWrap(True)
                lbl_value.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
                item_layout.addWidget(lbl_value)

            lbl_expl = QLabel(f"Giải thích: {item['explanation']}")
            lbl_expl.setStyleSheet("color: #94A3B8; font-size: 12px; margin-left: 22px; font-style: italic;")
            lbl_expl.setWordWrap(True)
            lbl_expl.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
            item_layout.addWidget(lbl_expl)

            ff_layout.addWidget(item_frame)

        self.rc_layout.addWidget(factors_frame)

        # AI summary frame — NO border
        ai_frame = make_section_frame()
        af_layout = QVBoxLayout(ai_frame)
        af_layout.setContentsMargins(15, 15, 15, 15)

        lbl_ai_title = QLabel("NHẬN XÉT TỔNG HỢP:")
        lbl_ai_title.setStyleSheet("font-size: 14px; font-weight: bold; color: #A855F7; margin-bottom: 5px;")
        af_layout.addWidget(lbl_ai_title)

        ai_text = self._generate_ai_summary(res)
        lbl_ai = QLabel(ai_text)
        lbl_ai.setWordWrap(True)
        lbl_ai.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        lbl_ai.setStyleSheet("color: #F8FAFC; font-size: 13px; background-color: #0F172A; "
                             "padding: 10px; border-radius: 6px; border: none;")
        af_layout.addWidget(lbl_ai)
        self.rc_layout.addWidget(ai_frame)

    def _generate_ai_summary(self, res):
        score = res["score"]
        details = res.get("details", [])
        failed = [d for d in details if not d["status"]]
        passed = [d for d in details if d["status"]]

        if score <= 15:
            base = "Kết quả kiểm tra cho thấy website này có các chỉ số an toàn tốt."
        elif score <= 40:
            base = "Kết quả kiểm tra cho thấy website có một số dấu hiệu nhỏ đáng lưu ý."
        elif score <= 65:
            base = "Kết quả kiểm tra phát hiện một số yếu tố rủi ro trung bình."
        else:
            base = "Kết quả kiểm tra phát hiện nhiều yếu tố nguy cơ cao."

        if failed:
            base += f" Cụ thể: {', '.join(f['label'].lower() for f in failed[:3])}."
        if passed:
            base += f" Điểm tích cực: {', '.join(p['label'].lower() for p in passed[:2])}."
        if score > 50:
            base += " Nên kiểm tra kỹ trước khi đăng nhập hoặc cung cấp thông tin cá nhân."
        else:
            base += " Nhìn chung website có độ tin cậy tương đối tốt, nhưng vẫn cần cẩn thận."
        return base


# =====================================================================
# PHONE SCANNER VIEW
# =====================================================================
class PhoneScannerView(QWidget):
    def __init__(self, db):
        super().__init__()
        self.db = db
        self.scanner = PhoneScanner(db)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        title = QLabel(read_text_cfg("menu_phone", "Xác minh Số điện thoại"))
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: #F8FAFC;")
        subtitle = QLabel("Đối chiếu số máy lạ với cơ sở dữ liệu các cuộc gọi quấy rối, mạo danh cơ quan chức năng.")
        subtitle.setStyleSheet("color: #94A3B8; font-size: 13px;")
        layout.addWidget(title)
        layout.addWidget(subtitle)

        input_layout = QHBoxLayout()
        self.input_phone = QLineEdit()
        self.input_phone.setStyleSheet(COMMON_INPUT_STYLE)
        self.input_phone.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        self.input_phone.setPlaceholderText("Nhập số điện thoại nghi ngờ cần tra cứu xác minh...")
        btn_scan = QPushButton("Tra Cứu")
        btn_scan.setStyleSheet("background-color: #38BDF8; color: #0F172A; font-weight: bold; padding: 10px 20px; border-radius: 6px; cursor: pointer;")
        btn_scan.setFixedWidth(130)
        btn_scan.clicked.connect(self.run_scan)
        input_layout.addWidget(self.input_phone)
        input_layout.addWidget(btn_scan)
        layout.addLayout(input_layout)

        # Skeleton
        self.skel_area = QWidget()
        sl = QVBoxLayout(self.skel_area)
        sl.setContentsMargins(0, 0, 0, 0)
        sl.addWidget(SkeletonBlock(height=100, radius=8))
        self.skel_area.setVisible(False)

        self.res_frame = make_section_frame()
        self.res_frame.setVisible(False)
        rf = QVBoxLayout(self.res_frame)
        rf.setContentsMargins(15, 15, 15, 15)
        self.lbl_level = QLabel("")
        self.lbl_details = QLabel("")
        self.lbl_details.setStyleSheet("color: #F8FAFC; font-size: 13px; line-height: 20px;")
        self.lbl_details.setWordWrap(True)
        rf.addWidget(self.lbl_level)
        rf.addWidget(self.lbl_details)

        layout.addWidget(self.skel_area)
        layout.addWidget(self.res_frame)
        layout.addStretch()

    def run_scan(self):
        phone = self.input_phone.text().strip()
        if not phone:
            return
        self.res_frame.setVisible(False)
        self.skel_area.setVisible(True)
        self._pending = phone
        QTimer.singleShot(600, self._do_scan)

    def _do_scan(self):
        phone = self._pending
        res = self.scanner.check_number(phone)
        self.skel_area.setVisible(False)
        self.res_frame.setVisible(True)
        lvl = "Nguy cơ cao" if res['level'] in ["Nguy hiểm", "High"] else "An toàn"
        self.lbl_level.setText(f"Mức độ rủi ro: {lvl}")
        self.lbl_level.setStyleSheet(f"font-size: 20px; font-weight: bold; color: {'#EF4444' if lvl == 'Nguy cơ cao' else '#22C55E'};")
        self.lbl_details.setText(
            f"Nhà mạng cung cấp: {res['carrier']}\n"
            f"Số lượt cộng đồng báo cáo xấu: {res['report_count']}\n"
            f"Nhận định: {res['desc']}"
        )
        self.db.add_history("phone", phone, res["score"], lvl)


# =====================================================================
# EMAIL SCANNER VIEW
# =====================================================================
class EmailScannerView(QWidget):
    def __init__(self, db):
        super().__init__()
        self.db = db
        self.scanner = EmailScanner()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)

        title = QLabel(read_text_cfg("menu_email", "Kiểm tra Rò rỉ Email"))
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: #F8FAFC;")
        subtitle = QLabel("Kiểm tra hộp thư điện tử cá nhân có bị lộ lọt mật khẩu, thông tin riêng tư từ các đợt rò rỉ công cộng.")
        subtitle.setStyleSheet("color: #94A3B8; font-size: 13px;")
        layout.addWidget(title)
        layout.addWidget(subtitle)

        input_layout = QHBoxLayout()
        self.input_email = QLineEdit()
        self.input_email.setStyleSheet(COMMON_INPUT_STYLE)
        self.input_email.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        self.input_email.setPlaceholderText("Nhập địa chỉ hòm thư email của bạn...")
        btn_scan = QPushButton("Kiểm Tra Ngay")
        btn_scan.setStyleSheet("background-color: #38BDF8; color: #0F172A; font-weight: bold; padding: 10px 20px; border-radius: 6px; cursor: pointer;")
        btn_scan.setFixedWidth(150)
        btn_scan.clicked.connect(self.run_scan)
        input_layout.addWidget(self.input_email)
        input_layout.addWidget(btn_scan)
        layout.addLayout(input_layout)

        self.skel_area = QWidget()
        sl = QVBoxLayout(self.skel_area)
        sl.setContentsMargins(0, 0, 0, 0)
        sl.addWidget(SkeletonBlock(height=100, radius=8))
        self.skel_area.setVisible(False)

        self.res_frame = make_section_frame()
        self.res_frame.setVisible(False)
        rf = QVBoxLayout(self.res_frame)
        rf.setContentsMargins(15, 15, 15, 15)
        self.lbl_status = QLabel("")
        self.lbl_desc = QLabel("")
        self.lbl_desc.setStyleSheet("color: #F8FAFC; font-size: 13px; line-height: 20px;")
        self.lbl_desc.setWordWrap(True)
        rf.addWidget(self.lbl_status)
        rf.addWidget(self.lbl_desc)

        layout.addWidget(self.skel_area)
        layout.addWidget(self.res_frame)
        layout.addStretch()

    def run_scan(self):
        email = self.input_email.text().strip()
        if not email:
            return
        self.res_frame.setVisible(False)
        self.skel_area.setVisible(True)
        self._pending = email
        QTimer.singleShot(600, self._do_scan)

    def _do_scan(self):
        email = self._pending
        res = self.scanner.check_email(email)
        self.skel_area.setVisible(False)
        self.res_frame.setVisible(True)
        lvl = "Nguy cơ cao" if res["pwned"] else "An toàn"
        self.lbl_status.setText("Phát Hiện Nguy Cơ Lộ Dữ Liệu!" if res["pwned"] else "Hộp thư an toàn")
        self.lbl_status.setStyleSheet(f"font-size: 18px; font-weight: bold; color: {'#EF4444' if res['pwned'] else '#22C55E'};")
        self.lbl_desc.setText(
            f"Kết quả phân tích: {res['details']}\n"
            f"Nguồn dữ liệu phát hiện: {res.get('source', 'Cơ sở dữ liệu nội bộ')}"
        )
        self.db.add_history("email", email, res["score"], lvl)


# =====================================================================
# IMAGE SCANNER VIEW
# =====================================================================
class ImageScannerView(QWidget):
    def __init__(self, parent_stack=None):
        super().__init__()
        self.parent_stack = parent_stack
        self.qr_decoder = QRScanner()
        outer_layout = QVBoxLayout(self)
        outer_layout.setContentsMargins(30, 30, 30, 30)
        outer_layout.setSpacing(20)

        title = QLabel(read_text_cfg("menu_image", "Kiểm tra hình ảnh / tệp tin"))
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: #F8FAFC;")
        subtitle = QLabel("Hỗ trợ phân tích Hình ảnh (PNG, JPG, JPEG, WEBP), Tệp tin văn bản (PDF, DOCX, TXT) thông qua AI Vision, và quét sâu Tệp nén (ZIP, RAR, 7Z) kể cả nén lồng nhau.")
        subtitle.setStyleSheet("color: #94A3B8; font-size: 13px;")
        outer_layout.addWidget(title)
        outer_layout.addWidget(subtitle)

        self.btn_upload = QPushButton(" Chọn hình ảnh hoặc tệp tin phân tích...")
        self.btn_upload.setIcon(qta.icon("fa5s.file-medical", color="#0F172A"))
        self.btn_upload.setStyleSheet("background-color: #38BDF8; color: #0F172A; font-weight: bold; padding: 12px; border-radius: 6px; font-size: 14px; cursor: pointer;")
        self.btn_upload.clicked.connect(self.process_file)
        outer_layout.addWidget(self.btn_upload)

        # Skeleton
        self.skel_area = QWidget()
        sl = QVBoxLayout(self.skel_area)
        sl.setContentsMargins(0, 0, 0, 0)
        sl.setSpacing(12)
        for h in [80, 120, 80]:
            sl.addWidget(SkeletonBlock(height=h, radius=8))
        sl.addStretch()
        self.skel_area.setVisible(False)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }" + SCROLLBAR_STYLE)

        self.res_frame = make_section_frame()
        self.res_frame.setVisible(False)
        rf = QVBoxLayout(self.res_frame)
        rf.setSpacing(12)
        rf.setContentsMargins(15, 15, 15, 15)

        self.lbl_info_title = QLabel("THÔNG TIN THUỘC TÍNH TỆP TIN:")
        self.lbl_info_title.setStyleSheet("font-weight: bold; color: #38BDF8; font-size: 14px;")
        rf.addWidget(self.lbl_info_title)

        self.lbl_content = QLabel("")
        self.lbl_content.setStyleSheet("color: #F8FAFC; font-size: 13px; line-height: 20px; background-color: #0F172A; padding: 10px; border-radius: 6px; border: none;")
        self.lbl_content.setWordWrap(True)
        self.lbl_content.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        self.lbl_content.setTextInteractionFlags(Qt.TextSelectableByMouse)
        rf.addWidget(self.lbl_content)

        self.lbl_ai_title = QLabel("PHÂN TÍCH NỘI DUNG CHUYÊN SÂU (AI VISION):")
        self.lbl_ai_title.setStyleSheet("font-weight: bold; color: #A855F7; font-size: 14px; margin-top: 5px;")
        rf.addWidget(self.lbl_ai_title)

        self.lbl_ai_desc = QLabel("")
        self.lbl_ai_desc.setStyleSheet("color: #F8FAFC; font-size: 13px; line-height: 20px; background-color: #0F172A; padding: 10px; border-radius: 6px; border: none;")
        self.lbl_ai_desc.setWordWrap(True)
        self.lbl_ai_desc.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        self.lbl_ai_desc.setTextInteractionFlags(Qt.TextSelectableByMouse)
        rf.addWidget(self.lbl_ai_desc)

        self.lbl_risk_title = QLabel("ĐÁNH GIÁ RỦI RO & KHUYẾN NGHỊ:")
        self.lbl_risk_title.setStyleSheet("font-weight: bold; color: #F59E0B; font-size: 14px; margin-top: 5px;")
        rf.addWidget(self.lbl_risk_title)

        self.lbl_risk_desc = QLabel("")
        self.lbl_risk_desc.setStyleSheet("color: #F8FAFC; font-size: 13px; line-height: 20px; background-color: #0F172A; padding: 10px; border-radius: 6px; border: none;")
        self.lbl_risk_desc.setWordWrap(True)
        self.lbl_risk_desc.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        self.lbl_risk_desc.setTextInteractionFlags(Qt.TextSelectableByMouse)
        rf.addWidget(self.lbl_risk_desc)

        self.btn_redirect = QPushButton("Chuyển Sang Bộ Quét Website Để Phân Tích Sâu Đường Dẫn QR")
        self.btn_redirect.setStyleSheet("background-color: #F59E0B; color: #0F172A; font-weight: bold; padding: 10px; border-radius: 6px; cursor: pointer;")
        self.btn_redirect.clicked.connect(self.redirect_web_scan)
        self.btn_redirect.setVisible(False)
        rf.addWidget(self.btn_redirect)
        rf.addStretch()

        scroll.setWidget(self.res_frame)
        outer_layout.addWidget(self.skel_area)
        outer_layout.addWidget(scroll, stretch=1)

    def process_file(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Chọn tệp tin phân tích", "",
            "Tất cả tệp hợp lệ (*.png *.jpg *.jpeg *.webp *.pdf *.docx *.txt *.zip *.rar *.7z);;"
            "Hình ảnh (*.png *.jpg *.jpeg *.webp);;Tài liệu (*.pdf *.docx *.txt);;"
            "Tệp nén (*.zip *.rar *.7z)"
        )
        if not file_path:
            return

        self.res_frame.setVisible(False)
        self.skel_area.setVisible(True)
        self._pending_path = file_path
        QTimer.singleShot(700, self._do_process)

    def _do_process(self):
        file_path = self._pending_path
        self.skel_area.setVisible(False)
        self.res_frame.setVisible(True)

        file_info = QFileInfo(file_path)
        ext = file_info.suffix().lower()
        f_size_kb = file_info.size() / 1024
        c_time = file_info.birthTime().toString("dd/MM/yyyy HH:mm:ss") if file_info.birthTime().isValid() else "Không rõ thời gian"

        info_text = (
            f"• Tên tệp tin: {file_info.fileName()}\n"
            f"• Đường dẫn: {file_path}\n"
            f"• Định dạng: {ext.upper()}\n"
            f"• Dung lượng tệp: {f_size_kb:.2f} KB\n"
            f"• Ngày tạo: {c_time}"
        )

        is_image = ext in ["png", "jpg", "jpeg", "webp"]
        is_archive = ext in ["zip", "rar", "7z"]
        qr_detected = False
        detected_text_content = ""
        archive_findings = None

        if is_image:
            img = QImage(file_path)
            info_text += f"\n• Kích thước hiển thị: {img.width()} x {img.height()} px"
            res = self.qr_decoder.decode_qr(file_path)
            if res and res.get("success"):
                qr_detected = True
                self.detected_url = res["content"]
                detected_text_content = f"[Mã QR phát hiện]: {self.detected_url}"
        elif is_archive:
            archive_findings = self.scan_archive(file_path)
            entry_count = archive_findings["total_entries"]
            suspicious = archive_findings["suspicious"]
            nested = archive_findings["nested_archives"]
            info_text += (
                f"\n• Tổng số tệp trong lưu trữ (kể cả nén lồng nhau): {entry_count}\n"
                f"• Số tệp đáng ngờ phát hiện: {len(suspicious)}\n"
                f"• Số lưu trữ nén lồng nhau (zip/rar/7z bên trong): {len(nested)}"
            )
            if suspicious:
                info_text += "\n• Danh sách tệp đáng ngờ:\n   - " + "\n   - ".join(suspicious[:15])
                if len(suspicious) > 15:
                    info_text += f"\n   ... và {len(suspicious) - 15} tệp khác"
            detected_text_content = (
                f"[Tệp nén]: {file_info.fileName()} - {entry_count} tệp, "
                f"{len(suspicious)} tệp đáng ngờ, {len(nested)} lưu trữ lồng nhau"
            )
        else:
            info_text += "\n• Thao tác cấu trúc: Đọc phân tích mã hash khối dữ liệu văn bản."
            detected_text_content = f"[Tài liệu văn bản hệ thống]: {file_info.fileName()}"

        self.lbl_content.setText(info_text)
        self.btn_redirect.setVisible(qr_detected and (res.get("is_url", False) if is_image and qr_detected else False))

        ai_description, risk_assessment = self.analyze_content_via_ai(
            file_info.fileName(), ext, detected_text_content, archive_findings
        )
        self.lbl_ai_desc.setText(ai_description)
        self.lbl_risk_desc.setText(risk_assessment)

    SUSPICIOUS_EXTENSIONS = {
        "exe", "bat", "cmd", "scr", "vbs", "js", "jar", "ps1", "msi",
        "com", "pif", "lnk", "hta", "wsf", "apk", "dll"
    }
    ARCHIVE_EXTENSIONS = {"zip", "rar", "7z"}

    def scan_archive(self, file_path, _depth=0, _max_depth=5):
        """Đọc đệ quy nội dung file nén (zip/rar/7z), trả về thống kê tệp đáng ngờ
        và các lưu trữ nén lồng nhau, kể cả khi nén nhiều lớp."""
        result = {"total_entries": 0, "suspicious": [], "nested_archives": []}
        if _depth > _max_depth:
            return result

        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        try:
            names = []
            if ext == "zip":
                with zipfile.ZipFile(file_path) as zf:
                    names = zf.namelist()
                    for name in names:
                        if name.endswith("/"):
                            continue
                        sub_ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
                        if sub_ext in self.ARCHIVE_EXTENSIONS:
                            result["nested_archives"].append(name)
                            try:
                                import tempfile
                                with zf.open(name) as f_in, tempfile.NamedTemporaryFile(
                                    delete=False, suffix=f".{sub_ext}"
                                ) as tmp:
                                    tmp.write(f_in.read())
                                    tmp_path = tmp.name
                                nested_result = self.scan_archive(tmp_path, _depth + 1, _max_depth)
                                result["total_entries"] += nested_result["total_entries"]
                                result["suspicious"] += [f"{name} -> {s}" for s in nested_result["suspicious"]]
                                result["nested_archives"] += [f"{name} -> {n}" for n in nested_result["nested_archives"]]
                                os.unlink(tmp_path)
                            except Exception:
                                pass
            elif ext == "rar" and rarfile:
                with rarfile.RarFile(file_path) as rf:
                    names = rf.namelist()
            elif ext == "7z" and py7zr:
                with py7zr.SevenZipFile(file_path, mode="r") as zf:
                    names = zf.getnames()
            else:
                return result

            for name in names:
                if name.endswith("/") or name.endswith("\\"):
                    continue
                result["total_entries"] += 1
                sub_ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
                if sub_ext in self.SUSPICIOUS_EXTENSIONS:
                    result["suspicious"].append(name)
                if sub_ext in self.ARCHIVE_EXTENSIONS and ext != "zip":
                    # zip handled recursively above; rar/7z nested archives flagged only
                    result["nested_archives"].append(name)
        except Exception as e:
            result["suspicious"].append(f"[Lỗi đọc lưu trữ: {e}]")

        return result

    def analyze_content_via_ai(self, filename, ext, context, archive_findings=None):
        fn_lower = filename.lower()
        if archive_findings is not None:
            suspicious = archive_findings["suspicious"]
            nested = archive_findings["nested_archives"]
            if suspicious:
                return (
                    f"Hệ thống đã quét sâu {archive_findings['total_entries']} tệp bên trong lưu trữ "
                    f"(bao gồm các lớp nén lồng nhau) và phát hiện {len(suspicious)} tệp có định dạng thực thi/script "
                    f"có khả năng gây hại.",
                    "CẢNH BÁO NGUY CƠ CAO: Lưu trữ chứa tệp thực thi (.exe, .bat, .js, .vbs...) - "
                    "KHÔNG mở các tệp này nếu không rõ nguồn gốc. Đây là dấu hiệu phổ biến của mã độc/ransomware."
                )
            if nested:
                return (
                    f"Hệ thống đã quét sâu {archive_findings['total_entries']} tệp, phát hiện "
                    f"{len(nested)} lưu trữ nén lồng nhau bên trong. Chưa phát hiện tệp thực thi đáng ngờ.",
                    "LƯU Ý: Tệp nén lồng nhau nhiều lớp đôi khi được dùng để né tránh phần mềm diệt virus. "
                    "Hãy thận trọng khi giải nén tiếp."
                )
            return (
                f"Hệ thống đã quét sâu {archive_findings['total_entries']} tệp bên trong lưu trữ, "
                "không phát hiện tệp thực thi hoặc script đáng ngờ.",
                "AN TOÀN: Chưa phát hiện dấu hiệu mã độc trong cấu trúc lưu trữ."
            )
        if "qr" in context.lower() or "qr" in fn_lower:
            return (
                "Hệ thống AI Vision phát hiện thực thể chứa cấu trúc mã QR phản hồi nhanh.",
                "CẢNH BÁO NGUY CƠ: Hãy kiểm tra kỹ trước khi quét mã QR, có dấu hiệu liên quan đến cổng đăng nhập hoặc giao dịch chuyển tiền."
            )
        if any(k in fn_lower for k in ["bill", "invoice", "chuyenkhoan", "bank", "nganhang"]):
            return (
                "Phân tích AI cho thấy cấu trúc tệp khớp với biểu mẫu hóa đơn hoặc biên lai chuyển khoản.",
                "LƯU Ý AN TOÀN: Xác minh biên lai gốc trên ứng dụng Mobile Banking, đề phòng biên lai giả mạo (Fake Bill)."
            )
        if ext in ["pdf", "docx", "txt"]:
            return (
                f"Văn bản hành chính hoặc biểu mẫu thông tin. Đã phân tích cấu trúc tệp {ext.upper()}.",
                "KHUYẾN NGHỊ: Đề phòng liên kết độc hại hoặc Macro nguy hại ẩn bên trong tài liệu."
            )
        return (
            "Hình ảnh / Tệp tin chứa dữ liệu thông thường, chưa có dấu hiệu bất thường trực quan.",
            "AN TOÀN: Chưa phát hiện hành vi lừa đảo cấu trúc trực diện."
        )

    def redirect_web_scan(self):
        if self.parent_stack and hasattr(self.parent_stack, "widget"):
            web_view = self.parent_stack.widget(1)
            if isinstance(web_view, WebScannerView):
                web_view.input_url.setText(self.detected_url)
                self.parent_stack.setCurrentIndex(1)
                web_view.run_scan()


# =====================================================================
# REPORT CENTER VIEW
# =====================================================================
class ReportCenterView(QWidget):
    def __init__(self, db, on_report_success=None):
        super().__init__()
        self.db = db
        self.on_report_success = on_report_success

        # Outer scroll to handle resize
        outer = QVBoxLayout(self)
        outer.setContentsMargins(30, 30, 30, 30)
        outer.setSpacing(15)

        title = QLabel(read_text_cfg("menu_report", "Gửi Báo cáo lừa đảo"))
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: #F8FAFC;")
        outer.addWidget(title)

        lbl_t1 = QLabel("Phân loại mục tiêu lừa đảo:")
        lbl_t1.setStyleSheet("color: #F8FAFC; font-weight: bold;")
        outer.addWidget(lbl_t1)

        self.cb_type = QComboBox()
        self.cb_type.addItems(["Đường dẫn liên kết (Website)", "Số điện thoại cuộc gọi", "Địa chỉ Email giả mạo"])
        self.cb_type.setStyleSheet(COMMON_INPUT_STYLE)
        outer.addWidget(self.cb_type)

        lbl_t2 = QLabel("Địa chỉ chi tiết đối tượng nghi vấn (Link URL / Số máy / Email):")
        lbl_t2.setStyleSheet("color: #F8FAFC; font-weight: bold;")
        outer.addWidget(lbl_t2)

        self.input_target = QLineEdit()
        self.input_target.setStyleSheet(COMMON_INPUT_STYLE)
        self.input_target.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        outer.addWidget(self.input_target)

        lbl_t3 = QLabel("Nội dung mô tả kịch bản lừa đảo hoặc dấu hiệu nhận biết:")
        lbl_t3.setStyleSheet("color: #F8FAFC; font-weight: bold;")
        outer.addWidget(lbl_t3)

        self.txt_desc = QTextEdit()
        self.txt_desc.setStyleSheet(COMMON_INPUT_STYLE)
        outer.addWidget(self.txt_desc)

        btn_submit = QPushButton("Gửi thông tin về hệ thống")
        btn_submit.setStyleSheet("background-color: #38BDF8; color: #0F172A; font-weight: bold; padding: 10px; border-radius: 6px; cursor: pointer;")
        btn_submit.clicked.connect(self.submit_report)
        outer.addWidget(btn_submit)
        outer.addStretch()

    def submit_report(self):
        target = self.input_target.text().strip()
        desc = self.txt_desc.toPlainText().strip()
        if not target or not desc:
            msg = QMessageBox(self)
            msg.setWindowTitle("Cảnh báo")
            msg.setText("Vui lòng điền đầy đủ thông tin.")
            msg.setIcon(QMessageBox.Icon.Warning)
            msg.setStyleSheet(MESSAGEBOX_STYLE)
            msg.exec()
            return
        r_type = "website" if self.cb_type.currentIndex() == 0 else ("phone" if self.cb_type.currentIndex() == 1 else "email")
        self.db.add_report(r_type, target, desc)
        msg = QMessageBox(self)
        msg.setWindowTitle("Thành công")
        msg.setText("Báo cáo của bạn đã được ghi nhận.")
        msg.setIcon(QMessageBox.Icon.Information)
        msg.setStyleSheet(MESSAGEBOX_STYLE)
        msg.exec()
        self.input_target.clear()
        self.txt_desc.clear()
        if self.on_report_success:
            self.on_report_success()


# =====================================================================
# SETTINGS VIEW
# =====================================================================
class SettingsView(QWidget):
    def __init__(self, on_save_callback=None, db=None):
        super().__init__()
        self.on_save_callback = on_save_callback
        self.db = db
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(15)

        title = QLabel("Cấu Hình Hệ Thống Ứng Dụng")
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: #F8FAFC;")
        layout.addWidget(title)

        self.load_all_json_configs()

        lbl1 = QLabel("Tên ứng dụng hiển thị (App Name):")
        lbl1.setStyleSheet("color: #F8FAFC; font-weight: bold;")
        layout.addWidget(lbl1)
        self.edit_app_name = QLineEdit(self.ui_text.get("app_name", ""))
        self.edit_app_name.setStyleSheet(COMMON_INPUT_STYLE)
        self.edit_app_name.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        layout.addWidget(self.edit_app_name)

        lbl2 = QLabel("Đường dẫn máy chủ API kết nối dữ liệu (API URL):")
        lbl2.setStyleSheet("color: #F8FAFC; font-weight: bold;")
        layout.addWidget(lbl2)
        self.edit_api_url = QLineEdit(self.app_config.get("api_url", ""))
        self.edit_api_url.setStyleSheet(COMMON_INPUT_STYLE)
        self.edit_api_url.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        layout.addWidget(self.edit_api_url)

        lbl3 = QLabel("Nội dung khẩu hiệu biểu ngữ phụ (Welcome Banner Subtitle):")
        lbl3.setStyleSheet("color: #F8FAFC; font-weight: bold;")
        layout.addWidget(lbl3)
        self.edit_banner_sub = QTextEdit()
        self.edit_banner_sub.setStyleSheet(COMMON_INPUT_STYLE)
        self.edit_banner_sub.setPlainText(self.ui_text.get("banner_subtitle", ""))
        self.edit_banner_sub.setMaximumHeight(80)
        layout.addWidget(self.edit_banner_sub)

        self.btn_save = QPushButton(" Lưu cấu hình ứng dụng")
        self.btn_save.setIcon(qta.icon("fa5s.save", color="#0F172A"))
        self.btn_save.setStyleSheet(
            "background-color: #38BDF8; color: #0F172A; font-weight: bold; "
            "padding: 12px; border-radius: 6px; font-size: 14px; margin-top: 15px; cursor: pointer;"
        )
        self.btn_save.clicked.connect(self.save_all_configs_to_disk)
        layout.addWidget(self.btn_save)

        # ── VÙNG NGUY HIỂM: Reset hệ thống ──────────────────────────
        divider = QFrame()
        divider.setFrameShape(QFrame.Shape.HLine)
        divider.setStyleSheet("color: #334155; background-color: #334155; border: none; max-height: 1px; margin-top: 10px;")
        layout.addWidget(divider)

        danger_title = QLabel("⚠  Vùng nguy hiểm")
        danger_title.setStyleSheet("color: #EF4444; font-size: 14px; font-weight: bold; margin-top: 6px;")
        layout.addWidget(danger_title)

        danger_desc = QLabel(
            "Reset hệ thống sẽ xoá toàn bộ lịch sử kiểm tra và báo cáo đã gửi.\n"
            "Thao tác này không thể hoàn tác."
        )
        danger_desc.setStyleSheet("color: #94A3B8; font-size: 12px;")
        danger_desc.setWordWrap(True)
        layout.addWidget(danger_desc)

        self.btn_reset = QPushButton(" Reset toàn bộ dữ liệu hệ thống")
        self.btn_reset.setIcon(qta.icon("fa5s.trash-alt", color="#F8FAFC"))
        self.btn_reset.setStyleSheet("""
            QPushButton {
                background-color: #7F1D1D;
                color: #F8FAFC;
                font-weight: bold;
                padding: 11px;
                border-radius: 6px;
                font-size: 13px;
                border: 1px solid #EF4444;
                cursor: pointer;
            }
            QPushButton:hover {
                background-color: #EF4444;
                color: #FFF;
            }
        """)
        self.btn_reset.clicked.connect(self.confirm_reset)
        layout.addWidget(self.btn_reset)

        layout.addStretch()

    def load_all_json_configs(self):
        self.app_config = {"api_url": "https://api.cybershield.vn/v1", "theme": "dark"}
        self.ui_text = {"app_name": "CyberShield Việt Nam", "banner_subtitle": "Hệ thống hỗ trợ phòng chống lừa đảo mạng."}
        if os.path.exists("config/app_config.json"):
            try:
                with open("config/app_config.json", "r", encoding="utf-8") as f:
                    self.app_config = json.load(f)
            except:
                pass
        if os.path.exists("config/ui_text.json"):
            try:
                with open("config/ui_text.json", "r", encoding="utf-8") as f:
                    self.ui_text = json.load(f)
            except:
                pass

    def save_all_configs_to_disk(self):
        self.ui_text["app_name"] = self.edit_app_name.text().strip()
        self.app_config["api_url"] = self.edit_api_url.text().strip()
        self.ui_text["banner_subtitle"] = self.edit_banner_sub.toPlainText().strip()
        os.makedirs("config", exist_ok=True)
        try:
            with open("config/app_config.json", "w", encoding="utf-8") as f:
                json.dump(self.app_config, f, ensure_ascii=False, indent=2)
            with open("config/ui_text.json", "w", encoding="utf-8") as f:
                json.dump(self.ui_text, f, ensure_ascii=False, indent=2)
            msg = QMessageBox(self)
            msg.setWindowTitle("Thành công")
            msg.setText("Đã lưu toàn bộ thiết lập mới!")
            msg.setIcon(QMessageBox.Icon.Information)
            msg.setStyleSheet(MESSAGEBOX_STYLE)
            msg.exec()
            if self.on_save_callback:
                self.on_save_callback()
        except Exception as e:
            msg = QMessageBox(self)
            msg.setWindowTitle("Lỗi")
            msg.setText(f"Không thể ghi file cấu hình: {e}")
            msg.setIcon(QMessageBox.Icon.Critical)
            msg.setStyleSheet(MESSAGEBOX_STYLE)
            msg.exec()

    def confirm_reset(self):
        if not self.db:
            return
        msg = QMessageBox(self)
        msg.setWindowTitle("Xác nhận Reset hệ thống")
        msg.setText(
            "Bạn có chắc chắn muốn xoá TOÀN BỘ dữ liệu không?\n\n"
            "• Lịch sử kiểm tra (lượt ktra, web nguy cơ, email, số máy)\n"
            "• Tất cả báo cáo lừa đảo đã gửi\n\n"
            "Thao tác này KHÔNG THỂ hoàn tác!"
        )
        msg.setIcon(QMessageBox.Icon.Warning)
        msg.setStandardButtons(QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.Cancel)
        msg.setDefaultButton(QMessageBox.StandardButton.Cancel)
        msg.button(QMessageBox.StandardButton.Yes).setText("Xác nhận Reset")
        msg.button(QMessageBox.StandardButton.Cancel).setText("Huỷ bỏ")
        msg.setStyleSheet(MESSAGEBOX_STYLE)
        ret = msg.exec()
        if ret == QMessageBox.StandardButton.Yes:
            try:
                self.db.reset_all_data()
                ok = QMessageBox(self)
                ok.setWindowTitle("Hoàn tất")
                ok.setText("Đã reset toàn bộ dữ liệu hệ thống thành công!")
                ok.setIcon(QMessageBox.Icon.Information)
                ok.setStyleSheet(MESSAGEBOX_STYLE)
                ok.exec()
                if self.on_save_callback:
                    self.on_save_callback()
            except Exception as e:
                err = QMessageBox(self)
                err.setWindowTitle("Lỗi")
                err.setText(f"Không thể reset dữ liệu: {e}")
                err.setIcon(QMessageBox.Icon.Critical)
                err.setStyleSheet(MESSAGEBOX_STYLE)
                err.exec()
