from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from api.views.translate import TranslateFileView
from api.services.upload_to_s3 import upload_file_to_s3

urlpatterns = [
    path('', include('api.urls.auth')),
    path('common-keyword/', include('api.urls.keyword')),
    path('user/', include('api.urls.user')),
    path('upload-to-s3/', upload_file_to_s3, name='upload_file_to_s3'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('translate/', TranslateFileView.as_view(), name='translate_file'),
    path('translated-file/', include('api.urls.translated_file')),
    path('notifications/', include('api.urls.notification')),
]