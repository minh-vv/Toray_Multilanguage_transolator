from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, TranslatedFile, Notification
from .models.keyword import KeywordSuggestion

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ["id", "email", "first_name", "last_name", "role", "is_active", "is_staff", "is_superuser"]
    search_fields = ["email", "first_name", "last_name"]
    list_filter = ["is_active", "is_staff", "is_superuser", "role"]
    ordering = ["-id"]
    
    fieldsets = (
        (None, {"fields": ("email", "first_name", "last_name", "password", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )
    
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "first_name", "last_name", "role", "password1", "password2", "is_active", "is_staff", "is_superuser"),
        }),
    )
    
    readonly_fields = ["id"]

class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'title', 'read', 'created_at']
    list_filter = ['read', 'created_at']
    search_fields = ['user__email', 'title', 'message']
    ordering = ['-created_at']

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Notification, NotificationAdmin)
    
@admin.register(KeywordSuggestion)
class KeywordSuggestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'approved_by', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'japanese', 'english', 'vietnamese', 'chinese_traditional', 'chinese_simplified')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Translation Content', {
            'fields': ('japanese', 'english', 'vietnamese', 'chinese_traditional', 'chinese_simplified')
        }),
        ('Status Information', {
            'fields': ('status', 'approved_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(TranslatedFile)
class TranslatedFileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'original_file_name', 'file_type', 'original_language', 'target_language', 'created_at')
    list_filter = ('file_type', 'original_language', 'target_language', 'created_at')
    search_fields = ('user__email', 'original_file_name')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('File Information', {
            'fields': ('original_file_url', 'original_file_name', 'translated_file_url', 'file_type')
        }),
        ('Language Information', {
            'fields': ('original_language', 'target_language')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )