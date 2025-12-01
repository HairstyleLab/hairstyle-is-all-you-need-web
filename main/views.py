from django.shortcuts import render

# Create your views here.

def main_view(request):
    return render(request, 'main/main.html')

def find_password(request):
    return render(request, 'main/find_password.html')

def signup(request):
    return render(request, 'main/signup.html')

def signup_form(request):
    return render(request, 'main/signup_form.html')