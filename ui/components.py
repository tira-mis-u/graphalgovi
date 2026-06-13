from PySide6.QtWidgets import QFrame, QVBoxLayout, QLabel, QHBoxLayout, QGraphicsDropShadowEffect, QWidget, QSizePolicy
from PySide6.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve
from PySide6.QtGui import QColor
import qtawesome as qta


class StatCard(QFrame):
    def __init__(self, title, value, icon_name, icon_color="#38BDF8"):
        super().__init__()
        self.setObjectName("Card")

        layout = QHBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)

        text_layout = QVBoxLayout()
        self.title_lbl = QLabel(title)
        self.title_lbl.setStyleSheet("color: #94A3B8; font-size: 12px; font-weight: bold;")
        self.title_lbl.setWordWrap(True)
        self.title_lbl.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)

        self.value_lbl = QLabel(str(value))
        self.value_lbl.setStyleSheet("color: #F8FAFC; font-size: 24px; font-weight: bold;")

        text_layout.addWidget(self.title_lbl)
        text_layout.addWidget(self.value_lbl)

        self.icon_lbl = QLabel()
        icon = qta.icon(icon_name, color=icon_color)
        self.icon_lbl.setPixmap(icon.pixmap(36, 36))
        self.icon_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.icon_lbl.setFixedSize(44, 44)

        layout.addLayout(text_layout, 1)
        layout.addWidget(self.icon_lbl)

        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(15)
        shadow.setColor(QColor(0, 0, 0, 60))
        shadow.setOffset(0, 4)
        self.setGraphicsEffect(shadow)

    def update_value(self, val):
        self.value_lbl.setText(str(val))


class SkeletonBlock(QFrame):
    """Animated skeleton loading placeholder block"""
    def __init__(self, height=20, width=None, radius=6, parent=None):
        super().__init__(parent)
        self.setFixedHeight(height)
        if width:
            self.setFixedWidth(width)
        self._alpha = 60
        self._going_up = True
        self.setStyleSheet(f"background-color: rgba(51, 65, 85, {self._alpha}); border-radius: {radius}px;")
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._pulse)
        self._timer.start(40)

    def _pulse(self):
        step = 4
        if self._going_up:
            self._alpha = min(180, self._alpha + step)
            if self._alpha >= 180:
                self._going_up = False
        else:
            self._alpha = max(60, self._alpha - step)
            if self._alpha <= 60:
                self._going_up = True
        self.setStyleSheet(f"background-color: rgba(51, 65, 85, {self._alpha}); border-radius: 6px;")

    def stop(self):
        self._timer.stop()


class SkeletonCard(QFrame):
    """Full skeleton stat card"""
    def __init__(self):
        super().__init__()
        self.setObjectName("Card")
        layout = QHBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(12)

        col = QVBoxLayout()
        col.setSpacing(10)
        col.addWidget(SkeletonBlock(height=14, radius=4))
        col.addWidget(SkeletonBlock(height=28, radius=4))
        layout.addLayout(col, 1)

        icon_skel = SkeletonBlock(height=40, width=40, radius=8)
        layout.addWidget(icon_skel)

        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(15)
        shadow.setColor(QColor(0, 0, 0, 60))
        shadow.setOffset(0, 4)
        self.setGraphicsEffect(shadow)


class SkeletonTableRow(QFrame):
    """Skeleton row for table-like loading"""
    def __init__(self, cols=4):
        super().__init__()
        layout = QHBoxLayout(self)
        layout.setContentsMargins(10, 8, 10, 8)
        layout.setSpacing(12)
        widths = [40, 80, 140, None, 90]
        for i in range(cols):
            w = widths[i] if i < len(widths) else None
            b = SkeletonBlock(height=14, width=w, radius=4)
            if w is None:
                layout.addWidget(b, 1)
            else:
                layout.addWidget(b)
