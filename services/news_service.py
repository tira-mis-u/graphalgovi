class NewsService:
    def get_latest_news(self) -> list:
        # Predefined cyber security news alerts feeds translated to local agency insights
        return [
            {
                "title": "Cảnh báo diện rộng: Chiến dịch lừa đảo mạo danh VNeID kích hoạt định danh mức 2",
                "source": "Cục An toàn thông tin",
                "date": "12/06/2026",
                "summary": "Kẻ xấu gửi SMS chứa link tải app độc hại (.apk) nhằm chiếm quyền điều khiển điện thoại ngân hàng của nạn nhân."
            },
            {
                "title": "Rộ tin nhắn 'nhận quà tri ân tri kỷ' từ các sàn thương mại điện tử lớn",
                "source": "CyberShield Việt Nam",
                "date": "10/06/2026",
                "summary": "Yêu cầu nạn nhân kết bạn Zalo, tham gia hội nhóm Telegram làm nhiệm vụ nạp tiền đầu tư sinh lời giả tạo."
            },
            {
                "title": "Bảo vệ thông tin căn cước công dân: Tuyệt đối không chia sẻ ảnh mặt trước/sau lên mạng xã hội",
                "source": "Trung tâm Giám sát an toàn không gian mạng quốc gia",
                "date": "08/06/2026",
                "summary": "Các đối tượng lừa đảo thu thập để đăng ký tài khoản ngân hàng ảo hoặc vay app đen gây hệ lụy nghiêm trọng."
            }
        ]