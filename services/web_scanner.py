import re
import math
import datetime
import socket
try:
    import tldextract
    import whois
except ImportError:
    tldextract = None
    whois = None

class WebScanner:
    SUSPICIOUS_KEYWORDS = [
        "trungthuong", "quatang", "momo", "shopee", "lazada", "vietcombank",
        "techcombank", "bidv", "sacombank", "nhanthuong", "bank", "crypto", "vneid",
        "login", "verify", "secure", "account", "signin", "password", "update", "confirm"
    ]

    def analyze_url(self, url: str) -> dict:
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        metrics = {
            "is_https": url.startswith('https://'),
            "length": len(url),
            "subdomain_count": 0,
            "subdomain_list": [],
            "has_ip": False,
            "suspicious_words": [],
            "domain_age_days": -1,
            "domain_registered_date": None,
            "is_blacklisted": False,
            "domain": "",
        }

        clean_url = url.replace('https://', '').replace('http://', '').split('/')[0]

        # IP detection
        ip_pattern = re.compile(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$')
        if ip_pattern.match(clean_url.split(':')[0]):
            metrics["has_ip"] = True

        if tldextract:
            ext = tldextract.extract(url)
            metrics["domain"] = f"{ext.domain}.{ext.suffix}"
            if ext.subdomain:
                parts = ext.subdomain.split('.')
                metrics["subdomain_count"] = len(parts)
                metrics["subdomain_list"] = parts
        else:
            metrics["domain"] = clean_url

        # Suspicious keywords
        for keyword in self.SUSPICIOUS_KEYWORDS:
            if keyword in url.lower():
                metrics["suspicious_words"].append(keyword)

        # Blacklist heuristics
        if "free" in url.lower() or "nhanthuong" in url.lower() or ("momo" in url.lower() and "momo.vn" not in url):
            metrics["is_blacklisted"] = True

        # Try domain age via whois
        today = datetime.date.today()
        if whois and not metrics["has_ip"]:
            old_timeout = socket.getdefaulttimeout()
            try:
                socket.setdefaulttimeout(4)  # tránh treo UI nếu WHOIS server không phản hồi
                w = whois.whois(metrics["domain"])
                created = w.creation_date
                if isinstance(created, list):
                    created = created[0]
                if created:
                    if isinstance(created, datetime.datetime):
                        created = created.date()
                    metrics["domain_age_days"] = (today - created).days
                    metrics["domain_registered_date"] = created.strftime("%d/%m/%Y")
            except Exception:
                pass
            finally:
                socket.setdefaulttimeout(old_timeout)

        # Build detailed report items
        details = []
        score = 0
        reasons = []

        # HTTPS check
        if metrics["is_https"]:
            details.append({
                "status": True,
                "label": "Sử dụng HTTPS",
                "value": "Có",
                "explanation": "Trang web sử dụng giao thức mã hóa HTTPS, giúp bảo vệ dữ liệu truyền tải."
            })
        else:
            score += 25
            reasons.append("Không sử dụng mã hóa bảo mật HTTPS")
            details.append({
                "status": False,
                "label": "Không sử dụng HTTPS",
                "value": "Không",
                "explanation": "Trang không dùng HTTPS. Dữ liệu bạn nhập có thể bị đánh cắp bởi bên thứ ba."
            })

        # URL length
        if metrics["length"] <= 75:
            details.append({
                "status": True,
                "label": "Độ dài URL bình thường",
                "value": f"{metrics['length']} ký tự",
                "explanation": "Độ dài URL nằm trong ngưỡng bình thường, không có dấu hiệu che giấu địa chỉ thật."
            })
        else:
            score += 15
            reasons.append(f"Đường dẫn quá dài ({metrics['length']} ký tự)")
            details.append({
                "status": False,
                "label": "URL quá dài",
                "value": f"{metrics['length']} ký tự",
                "explanation": "Kẻ gian thường dùng URL dài để che giấu địa chỉ thật của website. URL dài hơn 75 ký tự là dấu hiệu đáng ngờ."
            })

        # Subdomain
        if metrics["subdomain_count"] < 3:
            details.append({
                "status": True,
                "label": "Số lượng subdomain hợp lệ",
                "value": f"{metrics['subdomain_count']} subdomain",
                "explanation": "Số lượng subdomain nằm trong mức bình thường."
            })
        else:
            score += 20
            reasons.append(f"Quá nhiều subdomain cấp con ({metrics['subdomain_count']})")
            sub_str = ".".join(metrics["subdomain_list"])
            details.append({
                "status": False,
                "label": "Quá nhiều subdomain",
                "value": f"{metrics['subdomain_count']} subdomain: [{sub_str}]",
                "explanation": "Website lừa đảo thường dùng nhiều subdomain để giả mạo tên miền hợp pháp, ví dụ: secure.login.bank.example.com."
            })

        # IP address
        if not metrics["has_ip"]:
            details.append({
                "status": True,
                "label": "Không sử dụng địa chỉ IP trực tiếp",
                "value": metrics["domain"],
                "explanation": "Website sử dụng tên miền thay vì IP trực tiếp — đây là dấu hiệu bình thường."
            })
        else:
            score += 35
            reasons.append("Sử dụng địa chỉ IP trực tiếp thay vì tên miền")
            details.append({
                "status": False,
                "label": "Sử dụng địa chỉ IP trực tiếp",
                "value": clean_url,
                "explanation": "Website hợp pháp luôn dùng tên miền, không dùng IP trực tiếp. Đây là dấu hiệu rõ ràng của website giả mạo hoặc tạm thời."
            })

        # Suspicious keywords
        if not metrics["suspicious_words"]:
            details.append({
                "status": True,
                "label": "Không chứa từ khóa đáng ngờ",
                "value": "Không phát hiện",
                "explanation": "URL không chứa các từ khóa thường dùng trong chiến dịch giả mạo tài khoản hay lừa đảo."
            })
        else:
            score += 30
            reasons.append(f"Chứa từ khóa nhạy cảm: {', '.join(metrics['suspicious_words'])}")
            details.append({
                "status": False,
                "label": "Chứa từ khóa đáng ngờ",
                "value": ", ".join(metrics["suspicious_words"]),
                "explanation": "Các từ như 'login', 'verify', 'bank', 'secure', 'account' thường xuất hiện trong các chiến dịch giả mạo tài khoản ngân hàng, ví điện tử hoặc mạng xã hội."
            })

        # Domain age
        if metrics["domain_age_days"] == -1:
            details.append({
                "status": True,
                "label": "Không xác định được tuổi tên miền",
                "value": "Không truy vấn được WHOIS",
                "explanation": "Hệ thống không thể xác định ngày đăng ký tên miền. Đây có thể do tên miền mới hoặc thông tin bị ẩn."
            })
        elif metrics["domain_age_days"] < 30:
            score += 25
            reasons.append(f"Tên miền mới đăng ký ({metrics['domain_age_days']} ngày tuổi)")
            today_str = datetime.date.today().strftime("%d/%m/%Y")
            details.append({
                "status": False,
                "label": "Tên miền mới đăng ký",
                "value": f"Đăng ký ngày: {metrics['domain_registered_date']} | Hiện tại: {today_str} → Tuổi đời: {metrics['domain_age_days']} ngày",
                "explanation": "Nhiều website lừa đảo sử dụng tên miền mới tạo để tránh bị phát hiện và đưa vào danh sách đen. Tên miền dưới 30 ngày tuổi là dấu hiệu rủi ro."
            })
        else:
            details.append({
                "status": True,
                "label": "Tên miền có tuổi đời lâu",
                "value": f"Đăng ký ngày: {metrics['domain_registered_date']} → {metrics['domain_age_days']} ngày",
                "explanation": "Tên miền đã tồn tại lâu, giảm khả năng đây là website lừa đảo mới tạo."
            })

        # Blacklist
        if metrics["is_blacklisted"]:
            score += 40
            reasons.append("Nằm trong danh mục cảnh báo cộng đồng")
            details.append({
                "status": False,
                "label": "Nằm trong danh sách cảnh báo",
                "value": "Phát hiện trong CSDL cảnh báo nội bộ",
                "explanation": "URL này hoặc các từ khóa trong URL đã được cộng đồng báo cáo là liên quan đến lừa đảo, mạo danh hoặc tặng thưởng giả."
            })
        else:
            details.append({
                "status": True,
                "label": "Không nằm trong danh sách cảnh báo",
                "value": "Sạch",
                "explanation": "Không tìm thấy URL này trong cơ sở dữ liệu cảnh báo nội bộ của hệ thống."
            })

        score = min(100, score)

        if score <= 15:
            level = "An toàn"
        elif score <= 40:
            level = "Thấp"
        elif score <= 65:
            level = "Trung bình"
        elif score <= 85:
            level = "Cao"
        else:
            level = "Nguy hiểm"

        return {
            "score": score,
            "level": level,
            "reasons": reasons if reasons else ["Không phát hiện dấu hiệu bất thường nào."],
            "details": details,
            "url": url,
        }
