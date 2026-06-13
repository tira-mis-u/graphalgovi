class PhishingSimulation:
    def __init__(self):
        self.scenarios = [
            {
                "id": 1,
                "type": "email",
                "title": "Email thông báo từ Ngân hàng",
                "sender": "no-reply@vietcombank-security-update.com",
                "content": "Kính gửi quý khách, tài khoản của bạn bị tạm khóa do phát hiện đăng nhập lạ. Vui lòng bấm vào liên kết dưới đây để xác thực lại thông tin trong 24 giờ: http://vietcombank.com-verify.info/login",
                "is_phishing": True,
                "explanation": "ĐÂY LÀ EMAIL GIẢ MẠO! Hãy nhìn kỹ tên miền của người gửi (@vietcombank-security-update.com) và đường dẫn liên kết (com-verify.info). Ngân hàng chính thống không bao giờ dùng tên miền lạ này để yêu cầu nhập mật khẩu."
            },
            {
                "id": 2,
                "type": "website",
                "title": "Cổng thông tin dịch vụ công",
                "sender": "Trình duyệt hiển thị: https://dichvucong.gov.vn",
                "content": "Giao diện chính thức hiển thị đầy đủ logo quốc huy, yêu cầu đăng nhập bằng tài khoản định danh VNeID chính thống kết nối cơ sở dữ liệu quốc gia.",
                "is_phishing": False,
                "explanation": "ĐÂY LÀ WEBSITE THẬT! Đuôi tên miền kết thúc bằng '.gov.vn' là tên miền độc quyền dành riêng cho các cơ quan chính phủ và nhà nước Việt Nam, độ tin cậy tuyệt đối."
            },
            {
                "id": 3,
                "type": "email",
                "title": "Thông báo nhận thưởng sự kiện Tết",
                "sender": "skytuyen@momo.vn",
                "content": "Chúc mừng bạn đã trúng thưởng bao lì xì may mắn trị giá 5.000.000đ. Đăng nhập ngay trang chủ chính thức https://momo.vn để nhận tiền thưởng vào ví điện tử cá nhân.",
                "is_phishing": False,
                "explanation": "ĐÂY LÀ EMAIL THẬT! Người gửi dùng đuôi tên miền chính thức @momo.vn và đường dẫn trực tiếp dẫn về trang chủ không qua trung gian độc hại."
            }
        ]

    def get_scenarios(self):
        return self.scenarios