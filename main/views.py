import os
import json
from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.core.files import File
from .models import Gallery

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

from urllib.parse import quote

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

