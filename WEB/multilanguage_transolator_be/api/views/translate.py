import os
import sys
import docx
import openpyxl
import PyPDF2
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny,IsAuthenticated
from dotenv import load_dotenv
import tempfile
import requests
from ..models.translated_file import TranslatedFile
import boto3
from botocore.exceptions import NoCredentialsError
import uuid
import logging

# Cấu hình logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Thêm Translate_v2 vào PYTHONPATH
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '../../../../'))
sys.path.append(project_root)

try:
    from Translate_v2.translate_docx import translate_docx
    from Translate_v2.translate_pdf import pdf_to_docx, docx_to_pdf
    from Translate_v2.translate_xlsx import translate_xlsx
    from Translate_v2.translate_pptx import translate_pptx
    from Translate_v2.detect_lang import detect_language, extract_content, LANGUAGES
    logger.info("✅ Đã import thành công các module từ Translate_v2")
except ImportError as e:
    logger.error(f"❌ Lỗi khi import module từ Translate_v2: {str(e)}")
    raise

load_dotenv()

# Lấy giá trị từ biến môi trường
PROJECT_ID = os.getenv("PROJECT_ID")
GOOGLE_CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_CREDENTIALS_PATH

def upload_file_path_to_s3(file_path, bucket_name, object_name=None):
    """
    Upload a file to an S3 bucket

    :param file_path: Path to file on disk
    :param bucket_name: S3 bucket name
    :param object_name: S3 object name. If not specified, file_name is used
    :return: URL of the uploaded file if successful, else None
    """
    # If S3 object_name was not specified, use file_path
    if object_name is None:
        object_name = os.path.basename(file_path)

    # Create an S3 client
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_S3_REGION_NAME')
    )

    try:
        # Mở file và tải lên S3
        with open(file_path, 'rb') as file_obj:
            # Determine Content-Disposition and Content-Type
            content_disposition = 'inline' if object_name.endswith('.pdf') else 'attachment'
            content_type = 'application/pdf' if object_name.endswith('.pdf') else 'binary/octet-stream'
            
            # Upload the file
            s3_client.upload_fileobj(
                file_obj,
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

# ======= Hàm dịch tài liệu =======
def translate_document(file_path: str, target_language: str, original_file_url: str):
    file_extension = file_path.split(".")[-1].lower()
    logger.info(f"🔄 Bắt đầu dịch file: {file_path}")
    logger.info(f"📝 Định dạng file: {file_extension}")
    
    try:
        detected_language = detect_language(extract_content(file_path))
        logger.info(f"🌍 Ngôn ngữ phát hiện được: {detected_language}")
    except Exception as e:
        logger.error(f"❌ Lỗi khi phát hiện ngôn ngữ: {str(e)}")
        raise

    # Tạo đường dẫn file tạm
    base_name = file_path.rsplit(".", 1)[0]
    translated_file_path = f"{base_name}_{target_language}.{file_extension}"
    logger.info(f"📂 Đường dẫn file dịch: {translated_file_path}")

    temp_files = []  # Danh sách các file tạm cần xóa

    try:
        if file_extension == "pdf":
            logger.info("🔄 Xử lý file PDF")
            docx_path = file_path.replace(".pdf", ".docx")
            pdf_to_docx(file_path, docx_path)
            temp_files.append(docx_path)
            logger.info("✅ Đã chuyển PDF sang DOCX")
            # Dịch DOCX cho ngôn ngữ đích cụ thể
            translate_docx(docx_path, target_language)
            logger.info("✅ Đã dịch DOCX")
            # Chuyển DOCX đã dịch thành PDF
            translated_pdf_path = docx_to_pdf(docx_path)
            logger.info("✅ Đã chuyển DOCX sang PDF")
            translated_file_path = translated_pdf_path
        elif file_extension == "docx":
            logger.info("🔄 Xử lý file DOCX")
            # Dịch DOCX cho ngôn ngữ đích cụ thể
            translate_docx(file_path, target_language)
            logger.info("✅ Đã dịch DOCX")
            
        elif file_extension == "xlsx":
            logger.info("🔄 Xử lý file XLSX")
            translate_xlsx(file_path)
            logger.info("✅ Đã dịch XLSX")
            
        elif file_extension == "pptx":
            logger.info("🔄 Xử lý file PPTX")
            translated_file_path = translate_pptx(file_path, target_language)
            logger.info("✅ Đã dịch PPTX")
            
        else:
            logger.error(f"❌ Định dạng file không được hỗ trợ: {file_extension}")
            raise Exception("Unsupported file type")

        # Kiểm tra file dịch có tồn tại không
        if not os.path.exists(translated_file_path):
            logger.error(f"❌ Không tìm thấy file dịch: {translated_file_path}")
            # Kiểm tra xem file gốc có bị thay đổi không
            if os.path.exists(file_path):
                logger.info("✅ File gốc vẫn tồn tại")
                # Thử tạo file dịch từ file gốc
                if file_extension == "docx":
                    translate_docx(file_path, target_language)
                elif file_extension == "xlsx":
                    translate_xlsx(file_path)
                elif file_extension == "pptx":
                    translate_pptx(file_path)
                logger.info("🔄 Đã thử dịch lại file")
            else:
                logger.error("❌ File gốc không tồn tại")
            raise Exception(f"Translated file not found: {translated_file_path}")

        # Kiểm tra kích thước file dịch
        file_size = os.path.getsize(translated_file_path)
        if file_size == 0:
            logger.error("❌ File dịch có kích thước 0 bytes")
            raise Exception("Translated file is empty")

        logger.info(f"✅ File dịch tồn tại và có kích thước {file_size} bytes")

        # Tạo object name + upload lên S3
        bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
        hash_name = f"{uuid.uuid4().hex}.{file_extension}"
        object_name = f"translated/{hash_name}"
        logger.info(f"📤 Đang upload file lên S3: {object_name}")
        
        s3_url = upload_file_path_to_s3(translated_file_path, bucket_name, object_name)

        # Nếu upload thất bại => raise Exception để dừng lại
        if not s3_url:
            logger.error("❌ Upload file lên S3 thất bại")
            raise Exception("Failed to upload translated file to S3")

        logger.info(f"✅ Đã upload file lên S3 thành công: {s3_url}")

        return {
            "translated_file_url": s3_url,
            "original_file_url": original_file_url,
            "original_file_name": os.path.basename(file_path),
            "target_language": target_language,
            "original_language": detected_language,
            "file_type": file_extension,
        }
    except Exception as e:
        logger.error(f"❌ Lỗi trong quá trình dịch: {str(e)}")
        raise e
    finally:
        # Dọn dẹp file tạm
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    logger.info(f"🧹 Đã xóa file tạm: {temp_file}")
            except Exception as e:
                logger.warning(f"⚠️ Không thể xóa file tạm {temp_file}: {str(e)}")

        # Xóa file dịch nếu tồn tại
        try:
            if os.path.exists(translated_file_path):
                os.remove(translated_file_path)
                logger.info(f"🧹 Đã xóa file dịch tạm: {translated_file_path}")
        except Exception as e:
            logger.warning(f"⚠️ Không thể xóa file dịch tạm {translated_file_path}: {str(e)}")

# ======= API View =======
class TranslateFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_url = request.data.get("file_url")
        target_languages = request.data.get("target_languages") or []
        original_file_name = request.data.get("original_file_name")

        if not file_url or not target_languages:
            return JsonResponse({"detail": "Missing file_url or target_languages"}, status=400)

        if not isinstance(target_languages, list):
            return JsonResponse({"detail": "target_languages must be a list"}, status=400)

        file_ext = file_url.rsplit(".", 1)[-1].lower()
        file_name = original_file_name or os.path.basename(file_url)
        temp_path = os.path.join(tempfile.gettempdir(), f"tempfile.{file_ext}")

        try:
            resp = requests.get(file_url)
            resp.raise_for_status()
            with open(temp_path, "wb") as f:
                f.write(resp.content)

            results = []
            for lang in target_languages:
                try:
                    result = translate_document(temp_path, lang, file_url)
                    TranslatedFile.objects.create(
                        user=request.user,
                        original_file_url=file_url,
                        original_file_name=file_name,
                        translated_file_url=result["translated_file_url"],
                        original_language=result["original_language"],
                        target_language=lang,
                        file_type=result["file_type"],
                    )
                    results.append({
                        "language": lang,
                        "url": result["translated_file_url"]
                    })
                except Exception as e:
                    logger.error(f"❌ Lỗi khi dịch sang ngôn ngữ {lang}: {str(e)}")
                    continue

            if not results:
                return JsonResponse({"detail": "Failed to translate to any target language"}, status=500)

            return JsonResponse({"translated_files": results}, status=200)
        except Exception as e:
            logger.error(f"❌ Lỗi trong quá trình xử lý: {str(e)}")
            return JsonResponse({"detail": str(e)}, status=500)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
