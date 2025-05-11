from django.urls import path
from api.views.notification import NotificationView, MarkNotificationAsReadView

urlpatterns = [
    path('', NotificationView.as_view(), name='notifications'),
    path('<int:notification_id>/read/', MarkNotificationAsReadView.as_view(), name='mark-notification-read'),
] 