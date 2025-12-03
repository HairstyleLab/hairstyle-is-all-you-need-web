from django.urls import path
from main import views

app_name = 'main'

urlpatterns = [
    path('',views.main_view, name='main'),
    path('gallery/', views.gallery, name='gallery'),
    path('gallery/delete', views.gallery_del, name='gallery_del'),
    path("get-hair-images/", views.get_hair_images),
]