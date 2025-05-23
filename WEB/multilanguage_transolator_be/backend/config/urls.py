from django.contrib import admin
from django.urls import path, include
from api.urls import auth, keyword, translated_file, notification

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-auth/', include("rest_framework.urls")), 
    path('api/', include('api.urls')),
]
