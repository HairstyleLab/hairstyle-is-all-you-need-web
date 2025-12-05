import os
import json
import requests
import uuid
import base64
from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import HairStyleDictionary, HairStyleImage
from django.core.files import File
from django.views.decorators.http import require_http_methods
from .models import Gallery, Chat, Message
from django.http import JsonResponse
from urllib.parse import quote

FASTAPI_URL = "http://127.0.0.1:8000/query"

# Create your views here.

def main_view(request):
    return render(request, 'main/main.html')

@login_required
def gallery(request):
    user_id = request.user.id
    
    galleries = Gallery.objects.filter(user_id=user_id, is_deleted=False)

    return render(request, 'main/gallery.html', {'image_files': galleries,})

@login_required
def gallery_upload(request):
    user_id = request.user.id
    image_file = request.FILES.get('image')
    role = request.POST.get('role')

    # # 인덱싱용. 나중에 uuid로 교체
    # galleries = Gallery.objects.filter(user_id=user_id)

    # ### image를 객체로 받을때. (지금은 이미지 객체로 못받아서 저장된 이미지를 File로 바꾼거)
    # tmp_img_path = 'static/images/logo.png'
    # try:
    #     with open(tmp_img_path, 'rb') as f:
    #         gallery = Gallery(user_id=user_id)
    #         gallery.image_path.save(str(len(galleries))+tmp_img_path.split('/')[2], File(f))

    #     return JsonResponse({'success': True, 'message': '이미지 업로드 성공'})

    # except Exception as e:
    #     return JsonResponse({'success': False, 'message': f'{e} 오류 발생'})
    if image_file:
        try:
            gallery = Gallery(user_id=user_id)
            if role == 'user':
                gallery.is_deleted = True

            gallery.image_path.save(image_file.name, image_file)

            return JsonResponse({'success': True, 'message': "이미지 업로드 성공", 'image_id': gallery.image_id})

        except Exception as e:
            return JsonResponse({'success': False, 'message': f"{e} 오류 발생"})
    else:
        return JsonResponse({"success": True, "message": "저장할 이미지 없음"})

@login_required
def gallery_delete(request):
    # user_id = request.user.id
    data = json.loads(request.body)
    image_id = data.get('image_id')

    try:
        del_gallery = Gallery.objects.get(image_id=image_id)
        del_gallery.is_deleted = True
        del_gallery.save()

        return JsonResponse(
            {'success': True, "message": "이미지 삭제 성공"}
        )
    except:
        return JsonResponse(
            {'success': False, "message": "이미지 삭제 오류!"}
        )

# def get_hair_images(request):
#     gender = request.GET.get("gender")
#     category = request.GET.get("category")
#     name = request.GET.get("name")

#     try:
#         base_folder = HAIR_INFO["헤어스타일"][gender][category][name]
#     except KeyError:
#         return JsonResponse({"images": []})

#     abs_base_path = os.path.join(settings.BASE_DIR, "static", base_folder)

#     if not os.path.exists(abs_base_path):
#         return JsonResponse({"images": []})

#     result_images = []

#     subfolders = [
#         d for d in os.listdir(abs_base_path)
#         if os.path.isdir(os.path.join(abs_base_path, d))
#     ]

#     if subfolders:
#         for length_folder in subfolders:
#             length_path = os.path.join(abs_base_path, length_folder)

#             for file in os.listdir(length_path):
#                 if file.lower().endswith(('.jpg', '.jpeg', '.png')):
#                     relative_path = f"{base_folder}/{length_folder}/{file}"
#                     img_url = "/static/" + quote(relative_path)
#                     result_images.append({
#                         "length": length_folder,
#                         "url": img_url
#                     })

#     else:
#         for file in os.listdir(abs_base_path):
#             if file.lower().endswith(('.jpg', '.jpeg', '.png')):
#                 relative_path = f"{base_folder}/{file}"
#                 img_url = "/static/" + quote(relative_path)
#                 result_images.append({
#                     "length": None,
#                     "url": img_url
#                 })

#     return JsonResponse({"images": result_images})


def get_hair_images(request):
    # Step 1. 프론트에서 전달받은 값
    gender = request.GET.get("gender")         # male / female
    category = request.GET.get("category")     # cut / perm / color
    name = request.GET.get("name")             # 예: 가일컷

    # Step 2. JS 코드 값을 DB 코드로 변환
    gender_map = {
        "male": "m",
        "female": "f"
    }

    category_map = {
        "cut": "c",
        "perm": "p",
        "color": "l"
    }

    gender_code = gender_map.get(gender)
    category_code = category_map.get(category)

    if not gender_code or not category_code:
        return JsonResponse({"images": []})

    # Step 3. HairStyleDictionary에서 해당 스타일 찾기
    try:
        style = HairStyleDictionary.objects.get(
            name=name,
            gender=gender_code,
            category=category_code
        )
    except HairStyleDictionary.DoesNotExist:
        return JsonResponse({"images": []})

    # Step 4. 해당 스타일의 이미지 목록 가져오기
    images = HairStyleImage.objects.filter(name_gender=style)

    result = []

    for img in images:
        # DB에는 "hairstyle/male/가일컷/숏/1.jpg" 형태로 저장되어 있음
        relative_path = img.image_path

        # 실제 파일 경로 (MEDIA_ROOT 기준)
        abs_path = os.path.join(settings.MEDIA_ROOT, relative_path)

        # 파일 체크 (필수 아님)
        if not os.path.exists(abs_path):
            continue

        # 웹 URL (MEDIA_URL + DB 경로)
        url = settings.MEDIA_URL + quote(relative_path)

        result.append({
            "length": img.length,
            "url": url
        })

    return JsonResponse({"images": result})


def get_hair_list(request):
    gender_param = request.GET.get("gender")      # male / female
    category_param = request.GET.get("category")  # cut / perm / color

    gender_map = {"male": "M", "female": "F"}
    category_map = {"cut": "C", "perm": "P", "color": "L"}

    gender_code = gender_map.get(gender_param)
    category_code = category_map.get(category_param)

    # DB에서 gender + category 에 해당하는 모든 스타일 조회
    styles = HairStyleDictionary.objects.filter(
        gender=gender_code,
        category=category_code
    )

    # 초성별 그룹핑
    result = {}

    def get_initial(name):
        char = name[0]
        code = ord(char) - 44032
        if code < 0 or code > 11171:
            return None
        initials = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"]
        return initials[code // 588]

    for style in styles:
        initial = get_initial(style.name)
        if initial:
            result.setdefault(initial, []).append(style.name)

    return JsonResponse(result)


@login_required
def chat_list(request):
    """사용자의 채팅 기록 목록 조회"""
    user_id = request.user.id
    chats = Chat.objects.filter(user_id=user_id).order_by('-created_at')

    chat_list = [{
        'chat_id': chat.chat_id,
        'chat_title': chat.chat_title,
        'created_at': chat.created_at.strftime('%Y-%m-%d %H:%M:%S')
    } for chat in chats]

    return JsonResponse({'success': True, 'chats': chat_list})

@login_required
def chat_create(request):
    """새로운 채팅 생성"""
    if request.method == 'POST':
        data = json.loads(request.body)
        user_id = request.user.id
        message_text = data.get('message', '')

        # 채팅 제목: 메시지의 첫 15글자
        chat_title = message_text[:15] if len(message_text) <= 15 else message_text[:15] + '...'

        # Chat 생성
        chat = Chat.objects.create(
            user_id=user_id,
            chat_title=chat_title
        )

        return JsonResponse({
            'success': True,
            'chat_id': chat.chat_id,
            'chat_title': chat.chat_title
        })

    return JsonResponse({'success': False, 'message': 'Invalid request method'})

@login_required
def chat_detail(request, chat_id):
    """특정 채팅의 메시지 조회"""
    try:
        chat = Chat.objects.get(chat_id=chat_id, user_id=request.user.id)
        messages = Message.objects.filter(chat=chat).order_by('created_at')

        message_list = []
        for msg in messages:
            message_data = {
                'message_id': msg.message_id,
                'is_answer': msg.is_answer,
                'content': msg.content,
                'created_at': msg.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }

            # 이미지가 있으면 추가
            if msg.image:
                message_data['image_url'] = msg.image.image_path.url

            message_list.append(message_data)

        return JsonResponse({
            'success': True,
            'chat_title': chat.chat_title,
            'messages': message_list
        })
    except Chat.DoesNotExist:
        return JsonResponse({'success': False, 'message': '채팅을 찾을 수 없습니다.'})

@login_required
def message_save(request):
    """메시지 저장"""
    if request.method == 'POST':
        data = json.loads(request.body)
        chat_id = data.get('chat_id')
        content = data.get('content')
        is_answer = data.get('is_answer', 'Q')
        image_id = data.get('image_id', None)

        try:
            chat = Chat.objects.get(chat_id=chat_id, user_id=request.user.id)

            # Message 생성
            message = Message.objects.create(
                chat=chat,
                content=content,
                is_answer=is_answer,
                image_id=image_id
            )

            return JsonResponse({
                'success': True,
                'message_id': message.message_id
            })
        except Chat.DoesNotExist:
            return JsonResponse({'success': False, 'message': '채팅을 찾을 수 없습니다.'})

    return JsonResponse({'success': False, 'message': 'Invalid request method'})

@login_required
def chat_update(request, chat_id):
    """채팅 제목 수정"""
    if request.method == 'POST':
        data = json.loads(request.body)
        chat_title = data.get('chat_title', '')

        if not chat_title or len(chat_title) > 15:
            return JsonResponse({'success': False, 'message': '채팅 이름은 1~15글자여야 합니다.'})

        try:
            chat = Chat.objects.get(chat_id=chat_id, user_id=request.user.id)
            chat.chat_title = chat_title
            chat.save()

            return JsonResponse({
                'success': True,
                'chat_title': chat.chat_title
            })
        except Chat.DoesNotExist:
            return JsonResponse({'success': False, 'message': '채팅을 찾을 수 없습니다.'})

    return JsonResponse({'success': False, 'message': 'Invalid request method'})

@login_required
def chat_delete(request, chat_id):
    """채팅 삭제"""
    if request.method == 'POST':
        try:
            chat = Chat.objects.get(chat_id=chat_id, user_id=request.user.id)
            chat.delete()

            return JsonResponse({'success': True})
        except Chat.DoesNotExist:
            return JsonResponse({'success': False, 'message': '채팅을 찾을 수 없습니다.'})

    return JsonResponse({'success': False, 'message': 'Invalid request method'})


@require_http_methods(["GET", "POST"])
def message_response(request):
    if request.method == "GET":
        return render(request, "chat/chat.html")

    msg = request.POST.get("message", "").strip()
    image_id = request.POST.get("image_id")  # ← ★ 여기가 추가돼야 함

    # 기본 payload
    payload = {
        "query": msg,
        "session_id": f"{request.user.id}",
        "image_path": None
    }

    # image_id가 존재하면 DB에서 경로 불러오기
    if image_id:
        try:
            gallery_obj = Gallery.objects.get(id=image_id, is_deleted=False)
            image_path = gallery_obj.image_path  # 모델 필드명에 따라 수정
            payload["image_path"] = image_path
        except Gallery.DoesNotExist:
            pass

    print("➡ FastAPI 전달 payload:", payload)

    try:
        res = requests.post(FASTAPI_URL, json=payload, timeout=60)
        res.raise_for_status()
        data = res.json()
        bot_message = data.get("output", "응답을 가져오지 못했습니다.")
    except Exception as e:
        bot_message = f"FastAPI 서버 호출 오류: {str(e)}"

    return JsonResponse({"response": bot_message}, json_dumps_params={"ensure_ascii": False})
