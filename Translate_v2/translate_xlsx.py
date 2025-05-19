from lxml import etree
import os
import time
import html
import shutil
from fastapi import HTTPException
from .detect_lang import detect_language, extract_content, LANGUAGES, language_pair
from .translate_text import translate_text_with_glossary
from .xml_process import copy_and_extract, compress_folder

def translate_all_xml_in_folder(folder_path, glossary_id, source_lang, target_lang):
    for root_dir, dirs, files in os.walk(folder_path):
        for file in files:
            if not file.endswith(".xml"):
                continue

            xml_file_path = os.path.join(root_dir, file)

            # 🔍 Chỉ xử lý các file cần thiết
            rel_path = os.path.relpath(xml_file_path, folder_path).replace("\\", "/")  # Normalize for Windows
            if not (
                rel_path == "xl/sharedStrings.xml"
                or rel_path == "xl/workbook.xml"
                or rel_path.startswith("xl/drawings/drawing")  # Thêm xử lý cho drawing*.xml
                or rel_path == "xl/styles.xml"

                # or rel_path.startswith("xl/worksheets/sheet") and rel_path.endswith(".xml")
            ):
                continue

            print(f"🔵 Đang xử lý file XML: {xml_file_path}")

            try:
                # Đọc file XML bằng lxml
                parser = etree.XMLParser(remove_blank_text=True)
                tree = etree.parse(xml_file_path, parser)
                root = tree.getroot()
                if rel_path == "xl/styles.xml" and (folder_path.endswith("en") or folder_path.endswith("vi")):
                    ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

                    # Sửa font trong <fonts>
                    fonts_elem = root.find(".//a:fonts", namespaces=ns)
                    if fonts_elem is not None:
                        for font in fonts_elem.findall("a:font", namespaces=ns):
                            name_elem = font.find("a:name", namespaces=ns)
                            if name_elem is not None and "val" in name_elem.attrib:
                                old_font = name_elem.attrib["val"]
                                name_elem.set("val", "Times New Roman")
                    else:
                        print("Không tìm thấy thẻ <fonts> (có namespace)")
                        
                if rel_path == "xl/workbook.xml":
                    nsmap = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
                    for sheet in root.findall(".//ns:sheet", namespaces=nsmap):
                        if "name" in sheet.attrib:
                            original_name = html.unescape(sheet.attrib["name"]).strip()
                            try:
                                translated_name = translate_text_with_glossary(
                                    original_name, glossary_id, source_lang, target_lang
                                )
                                if translated_name:
                                    sheet.attrib["name"] = html.unescape(translated_name)
                                    # print(f"✅ Dịch tên sheet: '{original_name}' -> '{translated_name}'")
                                else:
                                    print(f"⚠️ Không thể dịch tên sheet: '{original_name}'")
                            except Exception as e:
                                print(f"⚠️ Lỗi khi dịch tên sheet: {original_name} — {e}")
                for elem in root.iter():
                    if elem.tag.endswith("}t") and elem.text and elem.text.strip():
                        original_text = elem.text.strip()
                        try:
                            translated_text = translate_text_with_glossary(
                                original_text, glossary_id, source_lang, target_lang
                            )
                            if translated_text:
                                elem.text = html.unescape(translated_text)
                        except Exception as e:
                            print(f"⚠️ Lỗi khi dịch đoạn text: {original_text} — {e}")

                # Ghi lại file XML với định dạng chuẩn
                tree.write(xml_file_path, pretty_print=True, xml_declaration=True, encoding="UTF-8")
                print(f"✅ Đã lưu file dịch: {xml_file_path}")

            except Exception as e:
                print(f"❌ Không thể xử lý file {xml_file_path} — {e}")

def translate_xlsx(xlsx_file):
    start = time.time()
    extracted_folder = copy_and_extract(xlsx_file)

    source_lang = detect_language(extract_content(xlsx_file))
    if source_lang not in LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported source language: {source_lang}")
    print(f"Detected language: {LANGUAGES[source_lang]}")
    target_langs = [lang for lang in LANGUAGES.keys() if lang != source_lang]
    for target_lang in target_langs:
        extracted_folder_temp = f"{extracted_folder}_{target_lang}"
        if os.path.exists(extracted_folder_temp):
            shutil.rmtree(extracted_folder_temp)
        extracted_folder_temp = shutil.copytree(extracted_folder, f"{extracted_folder}_{target_lang}")

        pair_code = f"{source_lang}-{target_lang}" if f"{source_lang}-{target_lang}" in language_pair.keys() else f"{target_lang}-{source_lang}"

        if pair_code not in language_pair:
            raise HTTPException(status_code=400, detail=f"Unsupported language pair: {pair_code}")
        
        glossary_id = f"toray_translation_glossary_{language_pair[pair_code]}"
        translate_all_xml_in_folder(extracted_folder_temp, glossary_id, source_lang, target_lang)
        output_xlsx = xlsx_file.replace(".xlsx", f"_{target_lang}.xlsx")
        compress_folder(extracted_folder_temp, xlsx_file, output_xlsx)

        # Xóa thư mục tạm extracted_folder_temp
        shutil.rmtree(extracted_folder_temp, ignore_errors=True)
    # Xóa thư mục tạm extracted_folder
    shutil.rmtree(extracted_folder, ignore_errors=True)

    # Xóa file zip tạm
    zip_path = xlsx_file.replace(".xlsx", "_copy.zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)
    end = time.time()
    print("Total time: ", end - start)
# Ví dụ sử dụng:
if __name__ == "__main__":
    xlsx_file = r"C:\Users\User\OneDrive - Hanoi University of Science and Technology\Documents\Lập trình cơ bản\Projects\[ISE] Toray translator project\Test library\仕样書- AY00139 .xlsx"
    translate_xlsx(xlsx_file)