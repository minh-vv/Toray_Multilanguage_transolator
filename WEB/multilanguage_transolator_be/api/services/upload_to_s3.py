import boto3
from botocore.exceptions import NoCredentialsError
import os
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from botocore.exceptions import NoCredentialsError

def upload_to_s3(file, bucket_name, object_name=None):
   
    # If S3 object_name was not specified, use file.name
    if object_name is None:
        object_name = file.name

    # Create an S3 client
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_S3_REGION_NAME')
    )

    # Determine Content-Disposition and Content-Type
    content_disposition = 'inline' if object_name.endswith('.pdf') else 'attachment'
    content_type = 'application/pdf' if object_name.endswith('.pdf') else 'binary/octet-stream'

    try:
        # Upload the file
        s3_client.upload_fileobj(
            file,
            bucket_name,
            object_name,
            ExtraArgs={
                'ContentDisposition': content_disposition,
                'ContentType': content_type
            }
        )
        print(f"File {object_name} uploaded to {bucket_name}/{object_name}")
        
        # Generate the public URL
        public_url = f"https://{bucket_name}.s3.amazonaws.com/{object_name}"
        return public_url
    except FileNotFoundError:
        print("The file was not found")
        return None
    except NoCredentialsError:
        print("Credentials not available")
        return None
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        return None

@csrf_exempt
def upload_file_to_s3(request):
    if request.method == 'POST':
        try:
            if 'file' not in request.FILES:
                return JsonResponse({'error': 'No file provided'}, status=400)

            file = request.FILES['file']
            bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')

            # Lấy phần mở rộng của file (ví dụ: pdf, docx)
            extension = file.name.split('.')[-1]
            # Tạo tên file hash + giữ phần mở rộng
            hashed_name = f"{uuid.uuid4().hex}.{extension}"
            object_name = f"uploads/{hashed_name}"

            # Upload file lên S3
            public_url = upload_to_s3(file, bucket_name, object_name)
            if public_url:
                return JsonResponse({
                    'publicUrl': public_url,
                    'originalFileName': file.name,
                    's3Key': object_name  
                })
            else:
                return JsonResponse({'error': 'Failed to upload file to S3'}, status=500)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

import boto3
from botocore.exceptions import NoCredentialsError
import os

def delete_from_s3(bucket_name, object_name):
    """
    Delete a file from an S3 bucket

    :param bucket_name: S3 bucket name
    :param object_name: S3 object key (e.g., 'uploads/abc123.pdf')
    :return: True if deleted successfully, False otherwise
    """
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_S3_REGION_NAME')
        )
        s3_client.delete_object(Bucket=bucket_name, Key=object_name)
        return True
    except NoCredentialsError:
        print("AWS credentials not available.")
        return False
    except Exception as e:
        print(f"Failed to delete from S3: {str(e)}")
        return False
