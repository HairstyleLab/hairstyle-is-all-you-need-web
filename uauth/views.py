from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json
from .utils import send_verification_email, verify_email_code, check_email_exists

def find_password(request):
    return render(request, 'uauth/find_password.html')


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
        
        # 이메일 존재 여부 확인
        if not check_email_exists(email):
            return JsonResponse({
                'success': False,
                'message': '가입되어 있지 않은 이메일입니다. 이메일 주소를 다시 한 번 확인해주세요.'
            }, status=400)
        
        success, result = send_verification_email(email)
        
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
        
        success, message = verify_email_code(email, code)
        
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
