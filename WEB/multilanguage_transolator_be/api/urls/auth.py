from django.contrib import admin
from django.urls import path, include
from api.views.auth import RegisterView, CustomTokenObtainPairView, ChangePasswordView,ForgotPasswordView,ResetPasswordView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView



urlpatterns = [
    path("user/register/", RegisterView.as_view(), name="register"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset_password"),
]
