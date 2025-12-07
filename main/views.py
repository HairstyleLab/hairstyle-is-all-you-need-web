import os
import json
import requests
import uuid
import base64
import boto3
from io import BytesIO
from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse
from django.contrib.auth.decorators import login_required
from django.core.files import File
from django.views.decorators.http import require_http_methods
from .models import Gallery, Chat, Message
from django.http import JsonResponse
from urllib.parse import quote
from markdown import markdown
import bleach

# FASTAPI_URL = "http://127.0.0.1:8000/query"
FASTAPI_URL = "http://69.30.85.100:22031/query"

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

            # 파일을 MEDIA_ROOT에 저장하고 경로를 image_path에 설정
            gallery.image_path.save(image_file.name, image_file, save=True)
            # save=True를 사용하면 Gallery 인스턴스도 자동으로 DB에 저장됨

            print(f"✅ 이미지 DB 저장 완료 - image_id: {gallery.image_id}, path: {gallery.image_path}")

            return JsonResponse({'success': True, 'message': "이미지 업로드 성공", 'image_id': gallery.image_id})

        except Exception as e:
            print(f"❌ 이미지 업로드 오류: {str(e)}")
            return JsonResponse({'success': False, 'message': f"{e} 오류 발생"})
    else:
        return JsonResponse({"success": True, "message": "저장할 이미지 없음"})

@login_required
def gallery_image_url(request, image_id):
    """이미지 ID로 이미지 URL 조회"""
    try:
        gallery_obj = Gallery.objects.get(image_id=image_id)

        # 이미지 URL 생성 (MEDIA_URL + 경로)
        if gallery_obj.image_path:
            image_url = gallery_obj.image_path.url
            return JsonResponse({
                'success': True,
                'image_url': image_url,
                'image_id': gallery_obj.image_id
            })
        else:
            return JsonResponse({'success': False, 'message': '이미지 경로가 없습니다.'})

    except Gallery.DoesNotExist:
        return JsonResponse({'success': False, 'message': '이미지를 찾을 수 없습니다.'})

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


@require_http_methods(["GET"])
def message_response(request):
    """SSE 스트리밍을 통한 실시간 상태 업데이트 및 응답 처리"""

    msg = request.GET.get("message", "").strip()
    image_id = request.GET.get("image_id")
    chat_id = request.GET.get("chat_id")

    # 디버깅: 받은 데이터 확인
    print(f"🔍 받은 메시지: '{msg}'")
    print(f"🔍 받은 image_id: '{image_id}'")
    print(f" 받은 chat_id: '{chat_id}'")

    # image_id가 존재하면 S3에서 이미지를 읽어서 base64 인코딩
    encoded_image = None
    if image_id and image_id.strip():
        try:
            gallery_obj = Gallery.objects.get(image_id=image_id)
            if gallery_obj.image_path:
                # S3에서 이미지 다운로드
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME
                )

                # gallery_obj.image_path.name은 S3 키 경로 (예: gallery/image.jpg)
                s3_key = gallery_obj.image_path.name
                print(f"🔍 S3에서 이미지 다운로드 시도: {s3_key}")

                # S3에서 이미지 다운로드
                buffer = BytesIO()
                s3_client.download_fileobj(
                    settings.AWS_STORAGE_BUCKET_NAME,
                    s3_key,
                    buffer
                )
                buffer.seek(0)
                image_content = buffer.read()

                # 파일 확장자로 MIME 타입 결정
                file_ext = os.path.splitext(s3_key)[1].lower()
                if file_ext in [".jpg", ".jpeg"]:
                    mime_type = "image/jpeg"
                elif file_ext == ".png":
                    mime_type = "image/png"
                elif file_ext == ".gif":
                    mime_type = "image/gif"
                else:
                    mime_type = "image/jpeg"  # 기본값

                encoded_image = f"data:{mime_type};base64,{base64.b64encode(image_content).decode('utf-8')}"
                print(f"✅ S3 이미지를 base64로 인코딩 완료: {s3_key}")
        except Gallery.DoesNotExist:
            print(f"❌ 이미지 ID {image_id}를 찾을 수 없습니다.")
        except Exception as e:
            print(f"❌ 이미지 인코딩 오류: {str(e)}")
            import traceback
            traceback.print_exc()

    # FastAPI SSE 스트리밍 URL 구성
    fastapi_stream_url = f"{FASTAPI_URL}/stream"
    session_id = f"{request.user.id}_{chat_id}" if chat_id else f"{request.user.id}"

    payload = {
        "query": msg,
        "session_id": session_id,
    }
    if encoded_image:
        payload["image_path"] = encoded_image

    print(f"➡ FastAPI SSE 호출 (POST): {fastapi_stream_url}")
    print(f"➡ Payload keys: {list(payload.keys())}")
    if encoded_image:
        print(f"➡ 이미지 데이터 길이: {len(encoded_image)} bytes")

    def event_stream():
        """SSE 이벤트를 Django에서 클라이언트로 전달"""
        try:
            # POST 요청으로 변경 (JSON body 사용)
            with requests.post(
                fastapi_stream_url,
                json=payload,
                stream=True,
                timeout=300,
                headers={'Content-Type': 'application/json'}
            ) as response:
                response.raise_for_status()

                bot_message = ""
                generated_image_id = None

                for line in response.iter_lines(decode_unicode=True):
                    if line.startswith('data: '):
                        data_str = line[6:]
                        try:
                            event_data = json.loads(data_str)
                            event_type = event_data.get("type")

                            if event_type == "status":
                                yield f"data: {json.dumps({'type': 'status', 'message': event_data['message']}, ensure_ascii=False)}\n\n"

                            elif event_type == "response":
                                bot_message = event_data.get("output", "")
                                generated_image = event_data.get("generated_image")

                                if generated_image:
                                    try:
                                        if generated_image.startswith("data:"):
                                            base64_data = generated_image.split(",", 1)[1]
                                        else:
                                            base64_data = generated_image

                                        from django.core.files.base import ContentFile
                                        from datetime import datetime

                                        image_binary = base64.b64decode(base64_data)
                                        gallery = Gallery(user_id=request.user.id, is_deleted=False)
                                        filename = f"generated_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                                        gallery.image_path.save(filename, ContentFile(image_binary), save=True)
                                        generated_image_id = gallery.image_id

                                        print(f"✅ 생성된 이미지 DB 저장 완료 - image_id: {generated_image_id}")
                                    except Exception as e:
                                        print(f"❌ 생성된 이미지 저장 오류: {str(e)}")

                                yield f"data: {json.dumps({'type': 'response', 'response': bot_message, 'generated_image_id': generated_image_id}, ensure_ascii=False)}\n\n"

                            elif event_type == "error":
                                yield f"data: {json.dumps({'type': 'error', 'message': event_data['message']}, ensure_ascii=False)}\n\n"

                        except json.JSONDecodeError:
                            continue

        except Exception as e:
            print(f"❌ FastAPI SSE 스트림 오류: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': f'서버 오류: {str(e)}'}, ensure_ascii=False)}\n\n"

        yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')
