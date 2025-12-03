from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.core.files import File
from .models import Gallery
from django.http import JsonResponse
import json
import os

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