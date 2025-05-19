import shutil
import os
from lxml import etree as ET
from fastapi import HTTPException
import html
from .detect_lang import detect_language, extract_content, LANGUAGES, language_pair
from .translate_text import translate_text_with_glossary
from .xml_process import copy_and_extract, compress_folder

# Thêm vào cùng file, trước khi dùng
def clean_and_merge_runs(xml_file_path):
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

    # Parse XML
    parser = ET.XMLParser(remove_blank_text=True)
    tree = ET.parse(xml_file_path, parser)
    root = tree.getroot()

    def clean_run(run):
        # Remove rsid attributes
        for attr in list(run.attrib):
            if 'rsidR' in attr:
                del run.attrib[attr]

        rpr = run.find('w:rPr', namespaces)
        if rpr is not None:
            # Remove <w:lang> in rPr
            for lang_tag in rpr.findall('w:lang', namespaces):
                rpr.remove(lang_tag)

        for t in run.findall('w:t', namespaces):
            t.attrib.pop('{http://www.w3.org/XML/1998/namespace}space', None)

        # Xóa <w:rPr> nếu đã rỗng
        if rpr is not None and len(rpr) == 0:
            run.remove(rpr)

    def rpr_equal(rpr1, rpr2):
        if rpr1 is None and rpr2 is None:
            return True
        if rpr1 is None or rpr2 is None:
            return False
        return ET.tostring(rpr1) == ET.tostring(rpr2)

    for para in root.findall('.//w:p', namespaces):
        runs = para.findall('w:r', namespaces)

        new_runs = []
        current_run = None

        for run in runs:
            clean_run(run)
            rpr = run.find('w:rPr', namespaces)
            t_elem = run.find('w:t', namespaces)
            text = t_elem.text if t_elem is not None else ''

            if current_run is None:
                current_run = ET.fromstring(ET.tostring(run))
                continue

            current_rpr = current_run.find('w:rPr', namespaces)

            if rpr_equal(rpr, current_rpr):
                current_text_elem = current_run.find('w:t', namespaces)
                if current_text_elem is not None:
                    current_text_elem.text = (current_text_elem.text or '') + text
                else:
                    new_t_elem = ET.SubElement(current_run, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                    new_t_elem.text = text
            else:
                new_runs.append(current_run)
                current_run = ET.fromstring(ET.tostring(run))

        if current_run is not None:
            new_runs.append(current_run)

        # Replace all old runs
        for run in runs:
            para.remove(run)
        for run in new_runs:
            para.append(run)

    tree.write(xml_file_path, pretty_print=True, xml_declaration=True, encoding="UTF-8")
    print(f"🧹 Đã clean file XML: {xml_file_path}")

def translate_all_xml_in_folder(folder_path, glossary_id, source_lang, target_lang):
    for root_dir, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith(".xml"):
                xml_file_path = os.path.join(root_dir, file)
                print(f"🔵 Đang xử lý file XML: {xml_file_path}")

                clean_and_merge_runs(xml_file_path)

                parser = ET.XMLParser(remove_blank_text=True)
                tree = ET.parse(xml_file_path, parser)
                root = tree.getroot()

                # Namespace cho file Word (docx)
                ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

                # # Nếu là styles.xml hoặc các file khác, thay đổi font chữ
                # for rFonts_elem in root.findall(".//w:rFonts", namespaces=ns):
                #     if rFonts_elem is not None:
                #         # Cập nhật font chữ
                #         rFonts_elem.set("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}ascii", "Times New Roman")
                #         rFonts_elem.set("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}eastAsia", "Times New Roman")
                #         rFonts_elem.set("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}hAnsi", "Times New Roman")
                #         rFonts_elem.set("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}cs", "Times New Roman")

                        # print(f"✅ Đã thay đổi font chữ: ascii={old_ascii}, eastAsia={old_eastAsia}, hAnsi={old_hAnsi}, cs={old_cs} -> Arial")

                # Duyệt qua các phần tử khác và dịch nội dung
                for elem in root.iter():
                    if elem.tag.endswith("}t") and elem.text and elem.text.strip():
                        original_text = elem.text.strip()
                        try:
                            translated_text = translate_text_with_glossary(
                                original_text, glossary_id, source_lang, target_lang
                            )
                            elem.text = html.unescape(translated_text)
                        except Exception as e:
                            print(f"⚠️ Lỗi khi dịch đoạn text: {original_text} — {e}")

                # Ghi lại file
                tree.write(xml_file_path, pretty_print=True, xml_declaration=True, encoding="UTF-8")
                print(f"✅ Đã lưu file dịch: {xml_file_path}")
                
def translate_docx(docx_file, target_lang=None):
    extracted_folder = copy_and_extract(docx_file)

    source_lang = detect_language(extract_content(docx_file))
    if source_lang not in LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported source language: {source_lang}")
    print(f"Detected language: {LANGUAGES[source_lang]}")
    
    # Nếu chỉ định ngôn ngữ đích cụ thể
    if target_lang:
        target_langs = [target_lang]
    else:
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
        
        # Đặt tên file dịch theo format của translate.py
        base_name = docx_file.rsplit(".", 1)[0]
        output_docx = f"{base_name}_{target_lang}.docx"
        compress_folder(extracted_folder_temp, docx_file, output_docx)

        # Xóa thư mục tạm extracted_folder_temp
        shutil.rmtree(extracted_folder_temp, ignore_errors=True)

    # Xóa thư mục tạm extracted_folder
    shutil.rmtree(extracted_folder, ignore_errors=True)

    # Xóa file zip tạm
    zip_path = docx_file.replace(".docx", "_copy.zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)

# Ví dụ sử dụng:
if __name__ == "__main__":
    docx_file = r"C:\Users\User\OneDrive - Hanoi University of Science and Technology\Documents\Lập trình cơ bản\Projects\[ISE] Toray translator project\Test library\docx_BaiTapER - Copy (2).docx"
    translate_docx(docx_file)