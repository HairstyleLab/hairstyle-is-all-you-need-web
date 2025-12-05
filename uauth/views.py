from django.shortcuts import render,redirect
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.conf import settings
from .models import User
from datetime import datetime, timedelta
import json
import re
import random
import string


# Utility functions
def check_email_exists(email):
    """이메일 중복 확인"""
    return User.objects.filter(email=email).exists()


def generate_verification_code():
    """6자리 인증코드 생성 (영문+숫자 조합)"""
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


def send_verification_email(email, request=None):
    """이메일로 인증코드 전송 (세션 기반)"""
    try:
        code = generate_verification_code()

        # 세션에 인증코드 저장 (3분 유효)
        if request:
            request.session[f'verification_code_{email}'] = {
                'code': code,
                'created_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(minutes=3)).isoformat()
            }
            request.session.modified = True

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


def verify_email_code(email, code, request=None):
    """이메일 인증코드 검증 (세션 기반)"""
    try:
        if not request:
            return False, "요청 정보가 없습니다."

        session_key = f'verification_code_{email}'

        if session_key not in request.session:
            return False, "인증코드가 존재하지 않습니다."

        verification_data = request.session[session_key]
        stored_code = verification_data.get('code')
        expires_at_str = verification_data.get('expires_at')

        # 유효시간 확인
        if expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str)
            if datetime.now() > expires_at:
                del request.session[session_key]
                request.session.modified = True
                return False, "인증코드가 만료되었습니다."

        # 코드 검증
        if stored_code != code:
            return False, "인증코드가 일치하지 않습니다."

        # 인증 완료 - 세션에서 제거
        del request.session[session_key]
        request.session.modified = True

        return True, "이메일 인증이 완료되었습니다."

    except Exception as e:
        return False, str(e)


# Views
def find_password(request):
    return render(request, 'uauth/find_password.html')

def signup(request):
    return render(request, 'uauth/signup.html')

def signup_form(request):
    return render(request, 'uauth/signup_form.html')


@csrf_exempt
@require_http_methods(["POST"])
def send_verification_code(request):
    try:
        data = json.loads(request.body)
        email = data.get('email')
        
        if not email:
            return JsonResponse({
                'success': False,
                'message': '이메일을 입력해주세요.'
            }, status=400)
        
        # 이메일 중복 확인 (이미 가입된 이메일이면 인증코드 발송 안 함)
        if check_email_exists(email):
            return JsonResponse({
                'success': False,
                'message': '이미 사용 중인 이메일입니다.'
            }, status=400)
        
        success, result = send_verification_email(email, request)
        
        if success:
            return JsonResponse({
                'success': True,
                'message': '인증코드가 이메일로 발송되었습니다.',
                'email': email
            })
        else:
            return JsonResponse({
                'success': False,
                'message': f'이메일 발송 실패: {result}'
            }, status=500)
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': '잘못된 요청입니다.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'오류가 발생했습니다: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def send_password_reset_code(request):
    try:
        data = json.loads(request.body)
        email = data.get('email')
        
        if not email:
            return JsonResponse({
                'success': False,
                'message': '이메일을 입력해주세요.'
            }, status=400)
        
        # 이메일 존재 여부 확인 (가입되어 있지 않으면 인증코드 발송 안 함)
        if not check_email_exists(email):
            return JsonResponse({
                'success': False,
                'message': '가입되어 있지 않은 이메일입니다.'
            }, status=400)
        
        success, result = send_verification_email(email, request)
        
        if success:
            return JsonResponse({
                'success': True,
                'message': '인증코드가 이메일로 발송되었습니다.',
                'email': email
            })
        else:
            return JsonResponse({
                'success': False,
                'message': f'이메일 발송 실패: {result}'
            }, status=500)
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': '잘못된 요청입니다.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'오류가 발생했습니다: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def verify_code(request):
    try:
        data = json.loads(request.body)
        email = data.get('email')
        code = data.get('code')
        
        if not email or not code:
            return JsonResponse({
                'success': False,
                'message': '이메일과 인증코드를 입력해주세요.'
            }, status=400)
        
        success, message = verify_email_code(email, code, request)
        
        return JsonResponse({
            'success': success,
            'message': message
        })
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': '잘못된 요청입니다.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'오류가 발생했습니다: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    """로그인 처리"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return JsonResponse({
                'success': False,
                'message': '이메일과 비밀번호를 입력해주세요.'
            }, status=400)
        
        # 이메일로 사용자 조회
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': '이메일 또는 비밀번호가 올바르지 않습니다.'
            }, status=401)
        
        # 비밀번호 확인
        if user.check_password(password):
            login(request, user)
            # 프로필 이미지 URL 안전하게 처리
            profile_image_url = None
            if user.profile_image:
                try:
                    profile_image_url = user.profile_image.url
                except:
                    profile_image_url = None
            
            return JsonResponse({
                'success': True,
                'message': '로그인 성공',
                'user': {
                    'email': user.email,
                    'nickname': user.nickname,
                    'profile_image': profile_image_url
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'message': '이메일 또는 비밀번호가 올바르지 않습니다.'
            }, status=401)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': '잘못된 요청입니다.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': '로그인 처리 중 오류가 발생했습니다.'
        }, status=500)


@require_http_methods(["POST"])
def logout_view(request):
    """로그아웃 처리"""
    logout(request)
    return JsonResponse({
        'success': True,
        'message': '로그아웃 되었습니다.'
    })


@csrf_exempt
@require_http_methods(["POST"])
def signup_view(request):
    """회원가입 처리"""
    try:
        # FormData로 전송된 경우
        email = request.POST.get('email')
        password = request.POST.get('password')
        nickname = request.POST.get('nickname')
        profile_image = request.FILES.get('profile_image')
        
        if not email or not password or not nickname:
            return JsonResponse({
                'success': False,
                'message': '모든 필드를 입력해주세요.'
            }, status=400)
        
        # 이메일 중복 체크
        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False,
                'message': '이미 사용 중인 이메일입니다.'
            }, status=400)
        
        # 사용자 생성
        user = User.objects.create_user(
            email=email,
            password=password,
            nickname=nickname
        )
        
        # 프로필 이미지가 있으면 저장
        if profile_image:
            user.profile_image = profile_image
            user.save()
        
        return JsonResponse({
            'success': True,
            'message': '회원가입이 완료되었습니다.'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'회원가입 처리 중 오류가 발생했습니다: {str(e)}'
        }, status=500)


def check_login_status(request):
    """로그인 상태 확인"""
    if request.user.is_authenticated:
        profile_image_url = None
        if request.user.profile_image:
            profile_image_url = request.user.profile_image.url
        
        return JsonResponse({
            'is_logged_in': True,
            'user': {
                'email': request.user.email,
                'nickname': request.user.nickname,
                'profile_image': profile_image_url
            }
        })
    else:
        return JsonResponse({
            'is_logged_in': False
        })


@csrf_exempt
@require_http_methods(["POST"])
def reset_password(request):
    """비밀번호 초기화"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        new_password = data.get('new_password')
        
        if not email or not new_password:
            return JsonResponse({
                'success': False,
                'message': '이메일과 새 비밀번호를 입력해주세요.'
            }, status=400)
        
        # 이메일로 사용자 조회
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': '사용자를 찾을 수 없습니다.'
            }, status=400)
        
        # 비밀번호 변경
        user.set_password(new_password)
        user.save()
        
        return JsonResponse({
            'success': True,
            'message': '비밀번호가 성공적으로 변경되었습니다.'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': '잘못된 요청입니다.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'오류가 발생했습니다: {str(e)}'
        }, status=500)
    
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def update_profile(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "POST 요청만 허용됩니다."})

    user = request.user

    # 닉네임 수정
    nickname = request.POST.get("nickname")
    if nickname:
        # 닉네임 유효성 검사 (한글만 2~10글자 또는 영어만 2~10글자)
        korean_only = re.match(r'^[가-힣]{2,10}$', nickname)
        english_only = re.match(r'^[a-zA-Z]{2,10}$', nickname)

        if not (korean_only or english_only):
            return JsonResponse({
                "success": False,
                "message": "해당 닉네임은 형식에 맞지 않습니다."
            })

        user.nickname = nickname

    # 프로필 이미지 수정
    if "profile_image" in request.FILES:
        user.profile_image = request.FILES["profile_image"]

    user.save()

    return JsonResponse({
        "success": True,
        "nickname": user.nickname,
        "profile_image": user.profile_image.url if user.profile_image else None
    })


@csrf_exempt
@require_http_methods(["POST"])
def change_password(request):
    """비밀번호 변경 (로그인된 사용자)"""
    try:
        if not request.user.is_authenticated:
            return JsonResponse({
                'success': False,
                'message': '로그인이 필요합니다.'
            }, status=401)
        
        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return JsonResponse({
                'success': False,
                'message': '현재 비밀번호와 새 비밀번호를 입력해주세요.'
            }, status=400)
        
        user = request.user
        
        # 현재 비밀번호 확인
        if not user.check_password(current_password):
            return JsonResponse({
                'success': False,
                'message': '현재 비밀번호가 올바르지 않습니다.',
                'error_type': 'current_password'
            }, status=400)
            
        if user.check_password(new_password):
            return JsonResponse({
                'success': False,
                'message': '새 비밀번호는 현재 비밀번호와 다르게 설정해야 합니다.',
                'error_type': 'new_password'
            }, status=400)
        
        # 새 비밀번호 설정
        user.set_password(new_password)
        user.save()
        
        # 비밀번호 변경 후 다시 로그인 처리
        login(request, user)
        
        return JsonResponse({
            'success': True,
            'message': '비밀번호가 성공적으로 변경되었습니다.'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': '잘못된 요청입니다.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'오류가 발생했습니다: {str(e)}'
        }, status=500)
        
@csrf_exempt
@require_http_methods(["POST"])
def withdraw(request):
    """회원 탈퇴 처리"""
    try:
        if not request.user.is_authenticated:
            return JsonResponse({
                'success': False,
                'message': '로그인이 필요합니다.'
            }, status=401)
            
        data = json.loads(request.body)
        password = data.get('password')
                
        user = request.user
        
        if not user.check_password(password):
            return JsonResponse({
                'success': False,
                'message': '비밀번호가 올바르지 않습니다.'
            }, status=400)
            
        user.delete()
        logout(request)
        
        return JsonResponse({
            'success': True,
            'message': '회원 탈퇴가 완료되었습니다.'
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'오류가 발생했습니다: {str(e)}'
        }, status=500)
