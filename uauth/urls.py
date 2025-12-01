from django.urls import path
from uauth import views

app_name = 'uauth'

urlpatterns = [
    path('find-password/', views.find_password, name='find_password'),
    path('send-verification-code/', views.send_verification_code, name='send_verification_code'),
    path('verify-code/', views.verify_code, name='verify_code'),
]