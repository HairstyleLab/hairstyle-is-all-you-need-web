from django.urls import path
from main import views

app_name = 'main'

urlpatterns = [
    path('',views.main_view, name='main'),
    path('signup/',views.signup,name='signup'),
    path('signup/form/',views.signup_form,name='signup_form'),
]

