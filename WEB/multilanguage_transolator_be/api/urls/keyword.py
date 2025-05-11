from django.urls import path
from api.views.keyword import ReviewSuggestionView, KeywordSuggestionView, ApproveSuggestionView, DeleteSuggestionView, UpdateKeywordView

urlpatterns = [
    path('suggestions/', KeywordSuggestionView.as_view(), name='suggestions'),
    path('suggestions/<int:pk>/review/', ReviewSuggestionView.as_view(), name='review-suggestion'),
    path('suggestions/<int:pk>/approve/', ApproveSuggestionView.as_view(), name='approve-suggestion'),
    path('<int:pk>/delete/', DeleteSuggestionView.as_view(), name='delete-suggestion'),
    path('<int:pk>/update/', UpdateKeywordView.as_view(), name='update-keyword'),
]
