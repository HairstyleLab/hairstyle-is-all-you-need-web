import os
import json
from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.core.files import File
from .models import Gallery, Chat, Message
from django.http import JsonResponse
from urllib.parse import quote
import json
import os

# Create your views here.

# JSON 로드 (프로젝트 시작 시 1번만)
HAIR_INFO_PATH = os.path.join(settings.BASE_DIR, "static", "data", "hair_info.json")

with open(HAIR_INFO_PATH, "r", encoding="utf-8") as f:
    HAIR_INFO = json.load(f)

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
    print('role:', role)
    # data = json.loads(request.body)
    # src = data.get('src')
    # print(src)

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

            return JsonResponse({'success': True, 'message': "이미지 업로드 성공"})

        except Exception as e:
            return JsonResponse({'success': False, 'message': f"{e} 오류 발생"})
    else:
        return JsonResponse({"success": True, "message": "저장할 이미지 없음"})

@login_required
def gallery_delete(request):
    # user_id = request.user.id
    data = json.loads(request.body)
    image_id = data.get('image_id')
    print(data)
    print(image_id)

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

def get_hair_images(request):
    gender = request.GET.get("gender")
    category = request.GET.get("category")
    name = request.GET.get("name")

    try:
        base_folder = HAIR_INFO["헤어스타일"][gender][category][name]
    except KeyError:
        return JsonResponse({"images": []})

    abs_base_path = os.path.join(settings.BASE_DIR, "static", base_folder)

    if not os.path.exists(abs_base_path):
        return JsonResponse({"images": []})

    result_images = []

    subfolders = [
        d for d in os.listdir(abs_base_path)
        if os.path.isdir(os.path.join(abs_base_path, d))
    ]

    if subfolders:
        for length_folder in subfolders:
            length_path = os.path.join(abs_base_path, length_folder)

            for file in os.listdir(length_path):
                if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                    relative_path = f"{base_folder}/{length_folder}/{file}"
                    img_url = "/static/" + quote(relative_path)
                    result_images.append({
                        "length": length_folder,
                        "url": img_url
                    })

    else:
        for file in os.listdir(abs_base_path):
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                relative_path = f"{base_folder}/{file}"
                img_url = "/static/" + quote(relative_path)
                result_images.append({
                    "length": None,
                    "url": img_url
                })

    return JsonResponse({"images": result_images})

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

