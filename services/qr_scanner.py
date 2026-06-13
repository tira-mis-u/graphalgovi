# Simulated QR Scanning Module utilizing native image upload or file selection
class QRScanner:
    def decode_qr(self, file_path: str) -> dict:
        if not file_path:
            return {"success": False, "content": ""}
            
        # Mock parser reading internal data strings
        # In deployment, users can utilize pyzbar or opencv-python seamlessly
        import os
        base = os.path.basename(file_path).lower()
        
        if "fake" in base or "malware" in base or "gift" in base:
            content = "http://momo-nhanthuong2026.gq/login-account"
        else:
            content = "https://chongluadao.vn"
            
        return {
            "success": True,
            "content": content,
            "is_url": content.startswith(("http://", "https://"))
        }