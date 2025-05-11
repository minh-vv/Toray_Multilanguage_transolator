from django.shortcuts import render
from rest_framework import generics
from ..serializers.user import RegisterSerializer, CustomUserSerializer
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny
from ..models.user import CustomUser, PasswordResetToken
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from rest_framework import status


class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        user = self.user
        
        data["id"] = user.id
        data["email"] = user.email
        data["first_name"] = user.first_name
        data["last_name"] = user.last_name
        data["role"] = user.role
        data["is_active"] = user.is_active
        data["is_staff"] = user.is_staff
        data["is_superuser"] = user.is_superuser

        return data
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        if not user.check_password(current_password):
            return Response(
                {"detail": "Mật khẩu hiện tại không đúng."},
                status=400,
            )

        if new_password != confirm_password:
            return Response(
                {"detail": "Mật khẩu mới và Mật khẩu xác nhận không khớp."},
                status=404,
            )

        user.set_password(new_password)
        user.save()

        return Response(
            {"detail": "Đổi mật khẩu thành công."},
            status=200,
        )

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]  

    def post(self, request):
        email = request.data.get('email')
        user = CustomUser.objects.get(email=email)
        if not user:
            return Response({'detail': 'Email không tồn tại'}, status=status.HTTP_404_NOT_FOUND)

        # Tạo mã OTP
        token = get_random_string(length=6, allowed_chars='0123456789')
        PasswordResetToken.objects.create(email=email, token=token)

        # Gửi email chứa mã OTP
        subject = 'Mã đặt lại mật khẩu'
        message = f'Mã đặt lại mật khẩu của bạn là: {token}. Hết hạn sau 10 phút.'
        send_mail(subject, message, 'your-email@gmail.com', [email])

        return Response({'detail': 'Mã đặt lại mật khẩu đã được gửi đến email của bạn'}, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        token = request.data.get('token')
        new_password = request.data.get('password')

        reset_token = PasswordResetToken.objects.filter(email=email, token=token).first()
        if not reset_token:
            return Response({'detail': 'Mã không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)
        if reset_token.is_expired():
            return Response({'detail': 'Mã đã hết hạn'}, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.get(email=email)
        user.set_password(new_password)  # Mã hóa mật khẩu
        print(f"new_password: {new_password}")
        user.save(update_fields=['password'])

        # Xóa token sau khi sử dụng
        reset_token.delete()

        return Response({'detail': 'Đặt lại mật khẩu thành công'}, status=status.HTTP_200_OK)