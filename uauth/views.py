from django.shortcuts import render,redirect
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json
from .utils import send_verification_email, verify_email_code, check_email_exists
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from .models import User

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
<<<<<<< HEAD
        
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
=======
>>>>>>> origin/develop
