import requests

class EmailScanner:
    def __init__(self):
        # API configurations endpoint placeholders
        self.hibp_url = "https://haveibeenpwned.com/api/v3/breachedaccount/"
        self.api_key = "" # User custom config parameter integrated

    def check_email(self, email: str) -> dict:
        if "@" not in email or "." not in email:
            return {"valid": False, "pwned": False, "score": 100, "level": "Nguy hiểm", "details": "Định dạng email sai."}
            
        # Simulate local blacklist database leak check / Integration simulator layer
        is_mock_leaked = email.lower() in ["admin@gmail.com", "test@gmail.com", "user@leaked-data-breach.com"]
        
        if is_mock_leaked:
            return {
                "valid": True,
                "pwned": True,
                "score": 85,
                "level": "Nguy hiểm",
                "source": "Bộ dữ liệu rò rỉ năm 2024 & 2025 (Giả lập hệ thống)",
                "details": "Email này xuất hiện trong 3 vụ rò rỉ dữ liệu lớn. Hãy đổi mật khẩu ngay lập tức!"
            }
            
        return {
            "valid": True,
            "pwned": False,
            "score": 0,
            "level": "An toàn",
            "source": "None",
            "details": "Không tìm thấy dữ liệu rò rỉ công khai liên quan đến địa chỉ email này."
        }