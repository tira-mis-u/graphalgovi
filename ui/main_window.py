from PySide6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                               QPushButton, QStackedWidget, QLabel)
from PySide6.QtCore import QSize, Qt
import qtawesome as qta

from ui.views import (DashboardView, WebScannerView, PhoneScannerView,
                      EmailScannerView, ImageScannerView,
                      ReportCenterView, SettingsView)


class MainWindow(QMainWindow):
    def __init__(self, db):
        super().__init__()
        self.db = db
        self.is_sidebar_collapsed = False

        self.setWindowTitle("CyberShield Việt Nam - Hệ Thống Phòng Chống Lừa Đảo Mạng")
        self.resize(1100, 700)
        self.setStyleSheet("background-color: #0F172A;")

        main_central_widget = QWidget()
        self.setCentralWidget(main_central_widget)
        hor_layout = QHBoxLayout(main_central_widget)
        hor_layout.setContentsMargins(0, 0, 0, 0)
        hor_layout.setSpacing(0)

        # ── SIDEBAR ──────────────────────────────────────────────────
        self.sidebar_frame = QWidget()
        self.sidebar_frame.setStyleSheet(
            "background-color: #1E293B; border-right: 1px solid #334155;"
        )
        self.sidebar_width_expanded  = 240
        self.sidebar_width_collapsed = 64
        self.sidebar_frame.setFixedWidth(self.sidebar_width_expanded)

        self.sidebar_layout = QVBoxLayout(self.sidebar_frame)
        self.sidebar_layout.setContentsMargins(0, 0, 0, 10)
        self.sidebar_layout.setSpacing(0)

        # ── Toggle button header (logo + tên app + nút ☰) ────────────
        self.header_widget = QWidget()
        self.header_widget.setFixedHeight(56)
        self.header_widget.setStyleSheet("background-color: #0F172A; border-bottom: 1px solid #334155;")
        header_layout = QHBoxLayout(self.header_widget)
        header_layout.setContentsMargins(12, 0, 8, 0)
        header_layout.setSpacing(8)

        self.lbl_logo = QLabel()
        self.lbl_logo.setPixmap(qta.icon("fa5s.shield-alt", color="#38BDF8").pixmap(22, 22))

        self.lbl_app_name = QLabel("CyberShield")
        self.lbl_app_name.setStyleSheet(
            "color: #38BDF8; font-size: 14px; font-weight: bold; background: transparent; border: none;"
        )

        self.btn_toggle = QPushButton()
        self.btn_toggle.setIcon(qta.icon("fa5s.bars", color="#94A3B8"))
        self.btn_toggle.setIconSize(QSize(16, 16))
        self.btn_toggle.setFixedSize(36, 36)
        self.btn_toggle.setToolTip("Thu gọn / Mở rộng menu")
        self.btn_toggle.setStyleSheet("""
            QPushButton {
                background: transparent;
                border: none;
                border-radius: 6px;
                padding: 6px;
            }
            QPushButton:hover {
                background-color: #334155;
            }
        """)
        self.btn_toggle.clicked.connect(self.toggle_sidebar_state)

        header_layout.addWidget(self.lbl_logo)
        header_layout.addWidget(self.lbl_app_name, 1)
        header_layout.addWidget(self.btn_toggle)
        self.sidebar_layout.addWidget(self.header_widget)

        # ── Menu items ────────────────────────────────────────────────
        self.menu_buttons = []

        self.dashboard_view = DashboardView(db)
        self.page_stack = QStackedWidget()
        menu_items = [
            ("Tổng quan hệ thống",      "fa5s.chart-pie",    self.dashboard_view),
            ("Kiểm tra Đường dẫn",      "fa5s.globe",        WebScannerView(db)),
            ("Xác minh Số máy",         "fa5s.phone",        PhoneScannerView(db)),
            ("Kiểm tra Rò rỉ Email",    "fa5s.envelope",     EmailScannerView(db)),
            ("Kiểm tra hình ảnh / tệp", "fa5s.file-image",   ImageScannerView(self.page_stack)),
            ("Gửi Báo cáo lừa đảo",     "fa5s.bullhorn",     ReportCenterView(db, self._on_report)),
            ("Cấu hình hệ thống",       "fa5s.cog",          SettingsView(on_save_callback=self._on_report, db=db)),
        ]

        hor_layout.addWidget(self.sidebar_frame)
        hor_layout.addWidget(self.page_stack)

        # Separator dưới header
        sep = QWidget()
        sep.setFixedHeight(6)
        sep.setStyleSheet("background: transparent;")
        self.sidebar_layout.addWidget(sep)

        BTN_STYLE_EXPANDED = """
            QPushButton {
                color: #94A3B8;
                background: transparent;
                border: none;
                padding: 10px 16px;
                font-size: 13px;
                text-align: left;
                border-radius: 6px;
            }
            QPushButton:hover {
                color: #F8FAFC;
                background-color: #0F172A;
            }
            QPushButton:checked {
                color: #38BDF8;
                background-color: #0F172A;
                font-weight: bold;
                border-left: 3px solid #38BDF8;
            }
        """

        for idx, (text, icon_str, view_widget) in enumerate(menu_items):
            btn = QPushButton(f"   {text}")
            btn.setIcon(qta.icon(icon_str, color="#94A3B8"))
            btn.setIconSize(QSize(16, 16))
            btn.setCheckable(True)
            btn.setAutoExclusive(True)
            btn.setProperty("raw_text", text)
            btn.setProperty("icon_str", icon_str)
            btn.setStyleSheet(BTN_STYLE_EXPANDED)
            btn.clicked.connect(lambda checked=False, i=idx: self.page_stack.setCurrentIndex(i))
            self.sidebar_layout.addWidget(btn)
            self.menu_buttons.append(btn)
            self.page_stack.addWidget(view_widget)

        self.menu_buttons[0].setChecked(True)
        self.sidebar_layout.addStretch(1)

    # ─────────────────────────────────────────────────────────────────
    def _on_report(self):
        """Callback khi gửi báo cáo thành công — refresh dashboard"""
        self.dashboard_view.refresh_dashboard()

    def toggle_sidebar_state(self):
        self.is_sidebar_collapsed = not self.is_sidebar_collapsed

        BTN_STYLE_EXPANDED = """
            QPushButton {
                color: #94A3B8;
                background: transparent;
                border: none;
                padding: 10px 16px;
                font-size: 13px;
                text-align: left;
                border-radius: 6px;
            }
            QPushButton:hover {
                color: #F8FAFC;
                background-color: #0F172A;
            }
            QPushButton:checked {
                color: #38BDF8;
                background-color: #0F172A;
                font-weight: bold;
                border-left: 3px solid #38BDF8;
            }
        """
        BTN_STYLE_COLLAPSED = """
            QPushButton {
                background: transparent;
                border: none;
                padding: 10px 0px;
                text-align: center;
                border-radius: 6px;
            }
            QPushButton:hover {
                background-color: #0F172A;
            }
            QPushButton:checked {
                background-color: #0F172A;
                border-left: 3px solid #38BDF8;
            }
        """

        if self.is_sidebar_collapsed:
            self.sidebar_frame.setFixedWidth(self.sidebar_width_collapsed)
            self.btn_toggle.setIcon(qta.icon("fa5s.chevron-right", color="#94A3B8"))
            self.lbl_logo.setVisible(False)
            self.lbl_app_name.setVisible(False)
            for btn in self.menu_buttons:
                btn.setText("")
                btn.setStyleSheet(BTN_STYLE_COLLAPSED)
                btn.setToolTip(btn.property("raw_text"))
        else:
            self.sidebar_frame.setFixedWidth(self.sidebar_width_expanded)
            self.btn_toggle.setIcon(qta.icon("fa5s.bars", color="#94A3B8"))
            self.lbl_logo.setVisible(True)
            self.lbl_app_name.setVisible(True)
            for btn in self.menu_buttons:
                raw_txt = btn.property("raw_text")
                btn.setText(f"   {raw_txt}")
                btn.setStyleSheet(BTN_STYLE_EXPANDED)
                btn.setToolTip("")
