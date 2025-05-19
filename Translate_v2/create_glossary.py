from google.cloud import translate_v3 as translate
import os
from dotenv import load_dotenv

load_dotenv()
project_id = os.getenv("PROJECT_ID")
input_uri = os.getenv("INPUT_URI")
google_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_credentials_path

language_pair = {
    "vi-en": 1,
    "vi-ja": 2,
    "vi-zh-CN": 3,
    "en-ja": 4,
    "en-zh-CN": 5,
    "ja-zh-CN": 6
}

def create_glossary(
    glossary_id,
    source_lang_code,
    target_lang_code,
    timeout: int = 180,
) -> translate.Glossary:
    """
    Create a equivalent term sets glossary. Glossary can be words or
    short phrases (usually fewer than five words).
    https://cloud.google.com/translate/docs/advanced/glossary#format-glossary
    """
    client = translate.TranslationServiceClient()

    # Supported language codes: https://cloud.google.com/translate/docs/languages
    source_lang_code = source_lang_code
    target_lang_code = target_lang_code
    location = "us-central1" 

    name = client.glossary_path(project_id, location, glossary_id)
    language_codes_set = translate.types.Glossary.LanguageCodesSet(
        language_codes=[source_lang_code, target_lang_code]
    )

    gcs_source = translate.types.GcsSource(input_uri=input_uri)

    input_config = translate.types.GlossaryInputConfig(gcs_source=gcs_source)

    glossary = translate.types.Glossary(
        name=name, language_codes_set=language_codes_set, input_config=input_config
    )

    parent = f"projects/{project_id}/locations/{location}"

    operation = client.create_glossary(parent=parent, glossary=glossary)

    result = operation.result(timeout)
    print(f"Created: {result.name}")
    print(f"Input Uri: {result.input_config.gcs_source.input_uri}")

    return result

def create_all_glossaries():
    """
    Create all glossaries based on the language_pair dictionary.
    Glossary IDs will follow the format: toray_translation_glossary_<number>.
    """
    for pair, glossary_id_suffix in language_pair.items():
        source_lang_code, target_lang_code = pair.split("-", 1)
        glossary_id = f"toray_translation_glossary_{glossary_id_suffix}"
        try:
            print(f"Creating glossary: {glossary_id} ({source_lang_code} -> {target_lang_code})")
            create_glossary(glossary_id, source_lang_code, target_lang_code)
        except Exception as e:
            print(f"Failed to create glossary {glossary_id}: {e}")

# Gọi hàm để tạo tất cả glossary
create_all_glossaries()
# import pandas as pd

# # Đọc file xlsx
# df = pd.read_excel(r"C:\Users\User\OneDrive - Hanoi University of Science and Technology\Documents\Lập trình cơ bản\Projects\[ISE] Toray translator project\Test library\library.xlsx")

# # Lưu dưới dạng CSV với mã hóa UTF-8
# df.to_csv(r"C:\Users\User\OneDrive - Hanoi University of Science and Technology\Documents\Lập trình cơ bản\Projects\[ISE] Toray translator project\Test library\library.csv", encoding='utf-8', index=False)