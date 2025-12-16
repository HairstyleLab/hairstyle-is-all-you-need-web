import os
import json
import requests
import uuid
import base64
import boto3
from io import BytesIO
from datetime import datetime
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
from PIL import Image

# FASTAPI_URL = "http://127.0.0.1:8000/query"
FASTAPI_URL = "http://194.68.245.28:22089/query"

# 이미지 리사이즈 함수
def resize_image(image_file, max_size=(1024, 1024), quality=100):
    """
    이미지를 리사이즈하고 최적화합니다.
    - max_size: 최대 크기 (width, height)
    - quality: JPEG 품질 (1-100)
    """
    try:
        # 이미지 열기
        img = Image.open(image_file)

        # EXIF 방향 정보 처리 (회전된 이미지 자동 보정)
        try:
            from PIL import ImageOps
            img = ImageOps.exif_transpose(img)
        except:
            pass

        # 원본 크기
        original_width, original_height = img.size

        # 비율 유지하면서 리사이즈
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        # RGB로 변환 (RGBA나 P 모드인 경우)
        if img.mode in ('RGBA', 'LA', 'P'):
            # 투명 배경을 흰색으로
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # BytesIO에 저장
        output = BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)

        return output
    except Exception as e:
        print(f"이미지 리사이즈 실패: {str(e)}")
        # 리사이즈 실패 시 원본 반환
        image_file.seek(0)
        return image_file

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

    if image_file:
        try:
            import time
            from datetime import datetime
            from django.core.files.uploadedfile import InMemoryUploadedFile

            # 이미지 리사이즈 (최대 1024x1024, 품질 85%)
            print(f"원본 이미지 크기: {image_file.size / 1024:.2f} KB")
            resized_image = resize_image(image_file, max_size=(1024, 1024), quality=100)

            # 파일명 충돌 방지: 타임스탬프 + UUID 추가 (항상 .jpg로 저장)
            unique_filename = f"{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.jpg"

            # BytesIO를 InMemoryUploadedFile로 변환
            resized_file = InMemoryUploadedFile(
                resized_image,
                None,
                unique_filename,
                'image/jpeg',
                resized_image.getbuffer().nbytes,
                None
            )

            print(f"리사이즈 후 크기: {resized_file.size / 1024:.2f} KB")
            print(f"S3 업로드 시작: {unique_filename}")

            gallery = Gallery(user_id=user_id)
            if role == 'user':
                gallery.is_deleted = True

            # S3에 파일 저장 (재시도 로직 추가)
            max_retries = 3
            retry_count = 0
            last_error = None

            while retry_count < max_retries:
                try:
                    # 파일을 S3에 저장하고 경로를 image_path에 설정
                    gallery.image_path.save(unique_filename, resized_file, save=True)
                    print(f"이미지 S3 업로드 완료 - image_id: {gallery.image_id}, path: {gallery.image_path}")

                    return JsonResponse({
                        'success': True,
                        'message': "이미지 업로드 성공",
                        'image_id': gallery.image_id
                    })

                except Exception as upload_error:
                    retry_count += 1
                    last_error = upload_error
                    print(f"S3 업로드 실패 (시도 {retry_count}/{max_retries}): {str(upload_error)}")

                    if retry_count < max_retries:
                        time.sleep(1)  # 1초 대기 후 재시도
                        resized_image.seek(0)  # 파일 포인터 리셋
                    else:
                        raise last_error

        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"이미지 업로드 최종 실패: {str(e)}")
            print(f"상세 에러:\n{error_detail}")

            # 사용자에게 구체적인 에러 메시지 전달
            error_message = "이미지 저장 중 문제 발생"
            if "timeout" in str(e).lower():
                error_message = "네트워크 타임아웃 - 다시 시도해주세요"
            elif "credentials" in str(e).lower() or "access" in str(e).lower():
                error_message = "서버 권한 오류 - 관리자에게 문의하세요"
            elif "bucket" in str(e).lower():
                error_message = "스토리지 연결 오류 - 잠시 후 다시 시도해주세요"

            return JsonResponse({'success': False, 'message': error_message})
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

@login_required
@require_http_methods(["POST"])
def copy_profile_to_gallery(request):
    """프로필 이미지를 Gallery로 복사"""
    try:
        user = request.user

        if not user.profile_image:
            return JsonResponse({
                'success': False,
                'message': '프로필 이미지가 없습니다.'
            })

        # S3에서 프로필 이미지 읽기
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )

        # 프로필 이미지 S3 키
        profile_key = user.profile_image.name

        # S3에서 이미지 다운로드
        buffer = BytesIO()
        s3_client.download_fileobj(
            settings.AWS_STORAGE_BUCKET_NAME,
            profile_key,
            buffer
        )
        buffer.seek(0)

        # Gallery에 새로 저장
        from django.core.files.uploadedfile import InMemoryUploadedFile
        from datetime import datetime

        unique_filename = f"profile_{user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.jpg"

        gallery = Gallery(user_id=user.id, is_deleted=True)
        gallery.image_path.save(unique_filename, buffer, save=True)

        return JsonResponse({
            'success': True,
            'image_id': gallery.image_id
        })

    except Exception as e:
        import traceback
        print(f"프로필 이미지 복사 실패: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': '프로필 이미지 복사 중 오류가 발생했습니다.'
        })

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

@login_required
def check_response_complete(request, chat_id):
    """채팅의 응답 완료 여부 확인 및 최신 메시지 반환"""
    try:
        # 해당 채팅의 마지막 메시지 확인
        last_message = Message.objects.filter(chat_id=chat_id).order_by('-created_at').first()

        if not last_message:
            return JsonResponse({'success': False, 'complete': False, 'message': '메시지가 없습니다.'})

        # 마지막 메시지가 봇 응답(A)이면 완료된 것
        if last_message.is_answer == 'A':
            # 응답 완료 시 캐시 정리 (중요!)
            from django.core.cache import cache
            status_key = f'chat_status_{chat_id}'
            cache.delete(status_key)

            # 이미지가 있는 경우 URL 포함
            image_url = None
            if last_message.image_id:
                try:
                    gallery = Gallery.objects.get(image_id=last_message.image_id)
                    if gallery.image_path:
                        image_url = gallery.image_path.url
                except Gallery.DoesNotExist:
                    pass

            return JsonResponse({
                'success': True,
                'complete': True,
                'message': last_message.content,
                'image_url': image_url,
                'message_id': last_message.message_id
            })
        else:
            # 마지막 메시지가 사용자 메시지(Q)면 아직 대기 중
            # 캐시에서 현재 상태 메시지 가져오기
            from django.core.cache import cache
            status_key = f'chat_status_{chat_id}'
            current_status = cache.get(status_key, '응답 생성 중...')

            return JsonResponse({
                'success': True,
                'complete': False,
                'status': current_status
            })

    except Exception as e:
        print(f"응답 완료 확인 오류: {str(e)}")
        return JsonResponse({'success': False, 'complete': False, 'message': str(e)})


@require_http_methods(["GET"])
def message_response(request):
    """SSE 스트리밍을 통한 실시간 상태 업데이트 및 응답 처리"""

    msg = request.GET.get("message", "").strip()
    image_id = request.GET.get("image_id")
    chat_id = request.GET.get("chat_id")
    user_id = request.user.id

    # 디버깅: 받은 데이터 확인
    print(f"받은 메시지: '{msg}'")
    print(f"받은 image_id: '{image_id}'")
    print(f"받은 chat_id: '{chat_id}'")

    # image_id가 존재하면 S3에서 이미지를 읽어서 base64 인코딩
    encoded_image = None
    if image_id and image_id.strip():
        try:
            gallery_obj = Gallery.objects.get(image_id=image_id)
            if gallery_obj.image_path:
                # S3에서 이미지 다운로드 (재시도 로직 추가)
                max_retries = 3
                retry_count = 0
                last_error = None

                while retry_count < max_retries:
                    try:
                        s3_client = boto3.client(
                            's3',
                            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                            region_name=settings.AWS_S3_REGION_NAME,
                            config=boto3.session.Config(
                                connect_timeout=5,
                                read_timeout=10,
                                retries={'max_attempts': 2}
                            )
                        )

                        # gallery_obj.image_path.name은 S3 키 경로 (예: gallery/image.jpg)
                        s3_key = gallery_obj.image_path.name
                        print(f"S3에서 이미지 다운로드 시도 (#{retry_count + 1}): {s3_key}")

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
                        print(f"S3 이미지를 base64로 인코딩 완료: {s3_key}")
                        break  # 성공하면 루프 탈출

                    except Exception as download_error:
                        retry_count += 1
                        last_error = download_error
                        print(f"S3 다운로드 실패 (시도 {retry_count}/{max_retries}): {str(download_error)}")

                        if retry_count < max_retries:
                            import time
                            time.sleep(1)  # 1초 대기 후 재시도
                        else:
                            raise last_error

        except Gallery.DoesNotExist:
            print(f"이미지 ID {image_id}를 찾을 수 없습니다.")
        except Exception as e:
            print(f"S3 이미지 다운로드 최종 실패: {str(e)}")
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
        import time
        start_time = time.time()
        try:
            # POST 요청으로 변경 (JSON body 사용)
            import time
            start_time = time.time()
            print(f"⏰ FastAPI 요청 시작 - 최대 대기 시간: 600초")
            print(f"⏰ 요청 시작 시각: {time.strftime('%Y-%m-%d %H:%M:%S')}")

            with requests.post(
                fastapi_stream_url,
                json=payload,
                stream=True,
                timeout=600,  # 10분으로 증가
                headers={'Content-Type': 'application/json'}
            ) as response:
                elapsed = time.time() - start_time
                print(f"✅ FastAPI 응답 연결 성공! (소요 시간: {elapsed:.2f}초)")
                print(f"✅ HTTP 상태 코드: {response.status_code}")
                print(f"✅ 응답 헤더: {dict(response.headers)}")

                response.raise_for_status()

                bot_message = ""
                generated_image_id = None
                first_response_time = None
                line_count = 0

                print(f"📡 SSE 스트림 읽기 시작...")
                for line in response.iter_lines(decode_unicode=True):
                    line_count += 1
                    if line_count % 10 == 0:
                        print(f"📡 현재까지 {line_count}개 라인 수신됨...")

                    if line.startswith('data: '):
                        data_str = line[6:]
                        try:
                            event_data = json.loads(data_str)
                            event_type = event_data.get("type")

                            if event_type == "status":
                                if first_response_time is None:
                                    first_response_time = time.time()
                                    print(f"첫 응답까지 시간: {first_response_time - start_time:.2f}초")
                                # 상태 메시지를 캐시에 저장 (폴링에서도 접근 가능)
                                from django.core.cache import cache
                                status_key = f'chat_status_{chat_id}'
                                cache.set(status_key, event_data['message'], timeout=300)  # 5분 동안 유지

                                yield f"data: {json.dumps({'type': 'status', 'message': event_data['message']}, ensure_ascii=False)}\n\n"

                            elif event_type == "response":
                                
                                end_time = time.time()
                                total_time = end_time - start_time
                                print(f"전체 응답 완료 시간: {total_time:.2f}초")

                                bot_message = event_data.get("output", "")
                                generated_image = event_data.get("generated_image")
                                generated_3d_model = event_data.get("generated_3d_model")

                                print(f"📦 응답 수신: output={bool(bot_message)}, image={bool(generated_image)}, 3d_model={bool(generated_3d_model)}")

                                if generated_image:
                                    try:
                                        if generated_image.startswith("data:"):
                                            base64_data = generated_image.split(",", 1)[1]
                                        else:
                                            base64_data = generated_image

                                        from django.core.files.base import ContentFile
                                        from datetime import datetime

                                        image_binary = base64.b64decode(base64_data)

                                        # S3 저장 재시도 로직
                                        max_retries = 3
                                        retry_count = 0
                                        last_error = None

                                        while retry_count < max_retries:
                                            try:
                                                gallery = Gallery(user_id=request.user.id, is_deleted=False)
                                                filename = f"generated_{request.user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.jpg"

                                                print(f"생성된 이미지 S3 업로드 시도 (#{retry_count + 1}): {filename}")

                                                gallery.image_path.save(filename, ContentFile(image_binary), save=True)
                                                generated_image_id = gallery.image_id

                                                print(f"생성된 이미지 S3 저장 완료 - image_id: {generated_image_id}")

                                                # 3D PLY 파일도 같이 저장 (실패해도 이미지는 저장됨)
                                                if generated_3d_model:
                                                    try:
                                                        # Runpod에서 직접 S3에 업로드한 경로를 받는 경우
                                                        if not generated_3d_model.startswith("data:"):
                                                            # S3 경로가 전송된 경우 (예: "gallery/ply/file.ply")
                                                            print(f"🎯 PLY 파일 S3 경로 수신: {generated_3d_model}")
                                                            gallery.ply_file_path = generated_3d_model
                                                            gallery.save()
                                                            print(f"✅ PLY 파일 경로 DB 저장 완료 - image_id: {generated_image_id}")
                                                        else:
                                                            # Base64 데이터로 전송된 경우 (기존 방식)
                                                            print(f"🎯 PLY 파일 처리 시작 (데이터 크기: {len(generated_3d_model) / 1024 / 1024:.2f} MB)")

                                                            mime_and_data = generated_3d_model.split(",", 1)
                                                            mime_type = mime_and_data[0].split(":")[1].split(";")[0]
                                                            ply_base64_data = mime_and_data[1]

                                                            print(f"🔍 MIME 타입: {mime_type}")
                                                            decoded_data = base64.b64decode(ply_base64_data)
                                                            print(f"📥 Base64 디코딩 완료: {len(decoded_data) / 1024 / 1024:.2f} MB")

                                                            # gzip으로 압축된 경우 압축 해제
                                                            if mime_type == "application/gzip":
                                                                import gzip
                                                                ply_binary = gzip.decompress(decoded_data)
                                                                print(f"PLY 파일 압축 해제: {len(decoded_data) / 1024 / 1024:.2f} MB → {len(ply_binary) / 1024 / 1024:.2f} MB")
                                                            else:
                                                                ply_binary = decoded_data

                                                            ply_filename = f"generated_{request.user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.ply"

                                                            print(f"생성된 PLY 파일 S3 업로드 시작: {ply_filename} ({len(ply_binary) / 1024 / 1024:.2f} MB)")
                                                            gallery.ply_file_path.save(ply_filename, ContentFile(ply_binary), save=True)
                                                            print(f"생성된 PLY 파일 S3 저장 완료 - image_id: {generated_image_id}")
                                                    except Exception as ply_error:
                                                        print(f"⚠️ PLY 파일 저장 실패 (이미지는 정상 저장됨): {str(ply_error)}")
                                                        import traceback
                                                        traceback.print_exc()
                                                        # PLY 저장 실패해도 계속 진행

                                                break  # 이미지 저장 성공하면 루프 탈출

                                            except Exception as save_error:
                                                retry_count += 1
                                                last_error = save_error
                                                print(f"생성된 이미지 저장 실패 (시도 {retry_count}/{max_retries}): {str(save_error)}")

                                                if retry_count < max_retries:
                                                    import time
                                                    time.sleep(1)
                                                else:
                                                    raise last_error

                                    except Exception as e:
                                        import traceback
                                        error_detail = traceback.format_exc()
                                        print(f"생성된 이미지 저장 최종 실패: {str(e)}")
                                        print(f"상세 에러:\n{error_detail}")

                                # 서버에서 바로 DB에 저장 (클라이언트 연결 상태 무관)
                                if chat_id:
                                    try:
                                        from .models import Message
                                        Message.objects.create(
                                            chat_id=chat_id,
                                            content=bot_message,
                                            is_answer='A',
                                            image_id=generated_image_id if generated_image_id else None
                                        )
                                        print(f"챗봇 응답 DB 저장 완료 - chat_id: {chat_id}, image_id: {generated_image_id}")
                                    except Exception as save_error:
                                        print(f"챗봇 응답 DB 저장 실패: {str(save_error)}")
                                        import traceback
                                        traceback.print_exc()

                                # 완료 시 캐시 정리
                                from django.core.cache import cache
                                status_key = f'chat_status_{chat_id}'
                                cache.delete(status_key)

                                yield f"data: {json.dumps({'type': 'response', 'response': bot_message, 'generated_image_id': generated_image_id}, ensure_ascii=False)}\n\n"

                            elif event_type == "error":
                                # 에러 시에도 캐시 정리
                                from django.core.cache import cache
                                status_key = f'chat_status_{chat_id}'
                                cache.delete(status_key)

                                yield f"data: {json.dumps({'type': 'error', 'message': event_data['message']}, ensure_ascii=False)}\n\n"

                        except json.JSONDecodeError:
                            continue

        except requests.exceptions.Timeout as timeout_err:
            print(f"❌ FastAPI 요청 타임아웃 (600초 초과): {str(timeout_err)}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': 'FastAPI 서버가 응답하지 않습니다 (타임아웃)'}, ensure_ascii=False)}\n\n"
        except requests.exceptions.ConnectionError as conn_err:
            print(f"❌ FastAPI 연결 오류: {str(conn_err)}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': 'FastAPI 서버에 연결할 수 없습니다'}, ensure_ascii=False)}\n\n"
        except requests.exceptions.HTTPError as http_err:
            print(f"❌ FastAPI HTTP 오류 (상태 코드: {http_err.response.status_code}): {str(http_err)}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': f'FastAPI 서버 오류 (HTTP {http_err.response.status_code})'}, ensure_ascii=False)}\n\n"
        except Exception as e:
            print(f"❌ FastAPI SSE 스트림 기타 오류: {str(e)}")
            print(f"❌ 오류 타입: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': f'서버 오류: {str(e)}'}, ensure_ascii=False)}\n\n"

        yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')

@login_required
def viewer_3d(request, image_id):
    """3D PLY 파일 뷰어 페이지"""
    try:
        gallery_obj = Gallery.objects.get(image_id=image_id, user_id=request.user.id)

        if not gallery_obj.ply_file_path:
            return JsonResponse({'success': False, 'message': '3D 모델 파일이 없습니다.'})

        # PLY 파일 URL 생성
        ply_url = gallery_obj.ply_file_path.url

        return render(request, 'main/viewer_3d.html', {
            'ply_url': ply_url,
            'image_id': image_id,
            'gallery': gallery_obj
        })
    except Gallery.DoesNotExist:
        return JsonResponse({'success': False, 'message': '이미지를 찾을 수 없습니다.'})

@require_http_methods(["POST"])
def feedback(request):
    """피드백 전송"""
    try:
        data = json.loads(request.body)
        content = data.get('content', '').strip()

        if not content:
            return JsonResponse({'success': False, 'message': '피드백 내용을 입력해주세요.'})

        # 사용자 정보
        user_email = 'Anonymous'
        if request.user.is_authenticated:
            user_email = request.user.email

        # 이메일 전송
        from django.core.mail import send_mail

        subject = f'[헤어스타일 피드백] {user_email}'
        message = f"""
피드백 내용:
{content}

---
작성자: {user_email}
작성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[os.getenv('EMAIL_HOST_USER')],
            fail_silently=False,
        )

        return JsonResponse({'success': True, 'message': '피드백이 전송되었습니다.'})

    except Exception as e:
        print(f"피드백 전송 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'message': '피드백 전송 중 오류가 발생했습니다.'})
