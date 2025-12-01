import random
import string
from django.core.mail import send_mail
from django.conf import settings
from .models import User, EmailVerification


def check_email_exists(email):
    return User.objects.filter(email=email).exists()


def generate_verification_code():
    while True:
        lowercase = string.ascii_lowercase
        highercase = string.ascii_uppercase
        digits = string.digits
        
        code_list = [
            random.choice(highercase),
            random.choice(lowercase),
            random.choice(digits)
        ]
        
        all_chars = highercase + lowercase + digits
        code_list.extend([random.choice(all_chars) for _ in range(3)])
        
        random.shuffle(code_list)
        code = ''.join(code_list)
        
        has_char = any(c in lowercase or c in highercase for c in code)
        has_digits = any(c in digits for c in code)
        
        if has_char and has_digits:
            return code


def send_verification_email(email):
    try:
        EmailVerification.objects.filter(email=email).delete()
        code = generate_verification_code()
        EmailVerification.objects.create(email=email, code=code)
        
        # 이메일 제목과 본문
        subject = '[HairstyleLab] 이메일 인증코드'
        message = f"""
안녕하세요 HairstyleLab입니다😊

HairstyleLab 가입을 위한 이메일 인증코드를 보내드립니다!

인증코드: {code}

이 인증코드는 3분간 유효합니다.
위 인증코드를 정확히 입력하여 이메일 인증을 완료해주세요.
감사합니다😊
        """
        
        # 이메일 전송
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        
        return True, code
    
    except Exception as e:
        print(f"이메일 전송 실패: {str(e)}")
        return False, str(e)


def verify_email_code(email, code):
    try:
        verification = EmailVerification.objects.get(email=email, code=code)
        
        # 유효시간 확인
        if verification.is_expired():
            return False, "인증코드가 만료되었습니다."
        
        # 인증 완료 처리
        verification.is_verified = True
        verification.save()
        
        return True, "이메일 인증이 완료되었습니다."
    
    except EmailVerification.DoesNotExist:
        return False, "인증코드가 일치하지 않습니다."
    except Exception as e:
        return False, str(e)
