import os
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.core.files import File
from .models import Gallery
import os

# Create your views here.

def main_view(request):
    return render(request, 'main/main.html')

@login_required
def gallery(request):
    user_id = request.user.id
    
    file_path = "close_icon.png"

    ### image_path가 문자열일 때, upload_to 가 안먹힘
    # gallery = Gallery.objects.create(
    #     user_id=user_id,
    #     image_path='gallery/' + file_path
    # )

    galleries = Gallery.objects.filter(user_id=user_id).order_by("-created_at")

    ### image를 객체로 받을때. (지금은 이미지 객체로 못받아서 저장된 이미지를 File로 바꾼거)
    tmp_img_path = 'static/images/hairdo_icon.png'
    if os.path.exists(tmp_img_path):
        with open(tmp_img_path, 'rb') as f:
            gallery = Gallery(user_id=user_id)
            gallery.image_path.save(file_path+str(len(galleries)), File(f))
    
    galleries = Gallery.objects.filter(user_id=user_id)

    return render(request, 'main/gallery.html', {'image_files': galleries,})

@login_required
def gallery_del(request):
    return