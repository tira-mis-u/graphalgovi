import math

class PasswordChecker:
    def check_password(self, password: str) -> dict:
        length = len(password)
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_symbol = any(not c.isalnum() for c in password)
        
        if length == 0:
            return {"score": 0, "level": "Rất yếu", "entropy": 0}

        pool_size = 0
        if has_lower: pool_size += 26
        if has_upper: pool_size += 26
        if has_digit: pool_size += 10
        if has_symbol: pool_size += 32
        
        entropy = length * math.log2(pool_size) if pool_size > 0 else 0
        
        # Categorize
        if entropy < 40 or length < 6:
            level = "Yếu"
            color = "#EF4444"
        elif entropy < 60 or length < 8:
            level = "Trung bình"
            color = "#F59E0B"
        elif entropy < 80:
            level = "Mạnh"
            color = "#22C55E"
        else:
            level = "Rất mạnh"
            color = "#38BDF8"
            
        return {
            "length": length,
            "has_upper": has_upper,
            "has_lower": has_lower,
            "has_digit": has_digit,
            "has_symbol": has_symbol,
            "entropy": round(entropy, 1),
            "level": level,
            "color": color
        }