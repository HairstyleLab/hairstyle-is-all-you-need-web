from django.shortcuts import render

# Create your views here.

def main_view(request):
    return render(request, 'main/main.html')

def gallery(request):
    import os

    static_dir = os.path.join('static', 'images')

    image_files = [f for f in os.listdir(static_dir)]

    return render(request, 'main/gallery.html', {'image_files': image_files, 'show': [True for _ in range(len(image_files))]})