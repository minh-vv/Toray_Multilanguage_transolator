import os
from google.cloud import translate_v3 as translate
from dotenv import load_dotenv
load_dotenv()
project_id = os.getenv("PROJECT_ID")
google_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_credentials_path
def translate_text_with_glossary(
    text: str,
    glossary_id: str,
    source_lang_code: str,
    target_lang_code: str,
) -> str:
    client = translate.TranslationServiceClient()
    location = "us-central1"
    parent = f"projects/{project_id}/locations/{location}"

    glossary = client.glossary_path(
        project_id, location, glossary_id
    )

    glossary_config = translate.TranslateTextGlossaryConfig(glossary=glossary)

    response = client.translate_text(
        request={
            "contents": [text],
            "target_language_code": target_lang_code,
            "source_language_code": source_lang_code,
            "parent": parent,
            "glossary_config": glossary_config,
        }
    )

    translations = [translation.translated_text for translation in response.glossary_translations]
    return translations[0] if translations else ""