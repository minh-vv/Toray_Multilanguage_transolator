from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated,IsAdminUser
from ..models.keyword import KeywordSuggestion
from ..models.notification import Notification
from ..serializers.keyword import KeywordSuggestionSerializer
from django.contrib.auth import get_user_model

class KeywordSuggestionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        suggestions = KeywordSuggestion.objects.all().order_by('-created_at')
        serializer = KeywordSuggestionSerializer(suggestions, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = KeywordSuggestionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
   
class ReviewSuggestionView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try: 
            suggestion = KeywordSuggestion.objects.get(id=pk)
        except KeywordSuggestion.DoesNotExist:
            return Response({"detail": "Suggestion not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if suggestion.status != 'pending':
            return Response({"detail": "Suggestion has already been approved"}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = KeywordSuggestionSerializer(suggestion, data=request.data, partial=True)
        if serializer.is_valid():
            suggestion = serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
class ApproveSuggestionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            suggestion = KeywordSuggestion.objects.get(id=pk)
        except KeywordSuggestion.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        if suggestion.status != 'pending':
            return Response({"detail": "Suggestion has already been approved"}, status=400)

        suggestion.status = 'approved'
        suggestion.approved_by = request.user
        suggestion.save()

        # Tạo notification cho tất cả người dùng
        User = get_user_model()
        users = User.objects.all()
        
        for user in users:
            Notification.objects.create(
                user=user,
                title="New Keyword Added",
                message="A new keyword has been added to the library.",
                details=True,
                keyword_details=[{
                    "japanese": suggestion.japanese,
                    "english": suggestion.english,
                    "vietnamese": suggestion.vietnamese,
                    "chinese_traditional": suggestion.chinese_traditional,
                    "chinese_simplified": suggestion.chinese_simplified
                }]
            )

        return Response({"message": "Suggestion approved!"})
    
class DeleteSuggestionView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            suggestion = KeywordSuggestion.objects.get(id=pk)
        except KeywordSuggestion.DoesNotExist:
            return Response({"detail": "Suggestion not found"}, status=status.HTTP_404_NOT_FOUND)

        # Chỉ admin hoặc người tạo mới được xoá
        if request.user != suggestion.user and not request.user.is_staff:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        suggestion.delete()
        return Response({"message": "Suggestion deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

class UpdateKeywordView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            keyword = KeywordSuggestion.objects.get(id=pk)
        except KeywordSuggestion.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = KeywordSuggestionSerializer(keyword, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)