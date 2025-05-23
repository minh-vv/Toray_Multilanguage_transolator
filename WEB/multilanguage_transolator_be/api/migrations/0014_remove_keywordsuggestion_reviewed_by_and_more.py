# Generated by Django 5.1.6 on 2025-05-04 04:27

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_delete_commonkeyword'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='keywordsuggestion',
            name='reviewed_by',
        ),
        migrations.AlterField(
            model_name='keywordsuggestion',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved')], default='pending', max_length=20),
        ),
        migrations.CreateModel(
            name='TranslatedFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('original_file', models.FileField(upload_to='original_files/')),
                ('translated_file', models.FileField(upload_to='translated_files/')),
                ('original_language', models.CharField(max_length=10)),
                ('target_language', models.CharField(max_length=10)),
                ('file_name', models.CharField(max_length=255)),
                ('file_type', models.CharField(max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='translated_files', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
