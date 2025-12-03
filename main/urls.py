from django.urls import path
from main import views

app_name = 'main'

urlpatterns = [
    path('',views.main_view, name='main'),
    path('gallery/', views.gallery, name='gallery'),
    path('gallery/upload', views.gallery_upload, name='gallery_upload'),
    path('gallery/delete', views.gallery_delete, name='gallery_delete')
]

