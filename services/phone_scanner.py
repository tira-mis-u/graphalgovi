import re

class PhoneScanner:
    def __init__(self, db_manager):
        self.db = db_manager

    def check_number(self, phone: str) -> dict:
        phone = re.sub(r'\s+|\+|-', '', phone)
        
        # Valid format
        is_valid = bool(re.match(r'^(0|84)(3|5|7|8|9)\d{8}$', phone))
        
        if not is_valid:
            return {
                "valid": False,
                "carrier": "Không xác định",
                "report_count": 0,
                "score": 100,
                "level": "Nguy hiểm",
                "desc": "Định dạng số điện thoại không hợp lệ tại Việt Nam."
            }

        # Carrier mapping prefix
        carrier = "Không xác định"
        if phone.startswith(('03', '843')) or phone.startswith(('096', '097', '098', '086')):
            carrier = "Viettel"
        elif phone.startswith(('07', '847')) or phone.startswith(('090', '093', '089')):
            carrier = "MobiFone"
        elif phone.startswith(('08', '848')) or phone.startswith(('088', '091', '094')):
            carrier = "VinaPhone"
        elif phone.startswith(('056', '058')):
            carrier = "Vietnamobile"

        # Check DB Reports
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM reports WHERE type='phone' AND target LIKE ?", (f"%{phone[-9:]}%",))
            report_count = cursor.fetchone()[0]

        # Calculate Risk Score
        score = 0
        if report_count > 0:
            score = min(100, 50 + report_count * 25)
        else:
            # Mock dangerous simulation numbers for preview testing
            if phone in ["0399999999", "0912345678", "0899123456"]:
                report_count = 5
                score = 90

        if score == 0:
            level = "An toàn"
        elif score <= 40:
            level = "Thấp"
        elif score <= 70:
            level = "Trung bình"
        else:
            level = "Nguy hiểm"

        return {
            "valid": True,
            "carrier": carrier,
            "report_count": report_count,
            "score": score,
            "level": level,
            "desc": f"Số thuộc nhà mạng {carrier}." if report_count == 0 else f"Số này bị báo cáo {report_count} lần vì hành vi lừa đảo nặc danh."
        }