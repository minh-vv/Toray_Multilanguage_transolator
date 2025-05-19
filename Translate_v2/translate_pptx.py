from lxml import etree
import os
import time
import html
import shutil
from fastapi import HTTPException
from .detect_lang import detect_language, extract_content, LANGUAGES, language_pair
from .translate_text import translate_text_with_glossary
from .xml_process import copy_and_extract, compress_folder
def rpr_format_key(r_elem):
    """
    Sinh ra key định danh format của <a:rPr> trong <a:r>.
    Bỏ qua lang, altLang. So sánh cả thuộc tính của các child element.
    """
    rpr = r_elem.find(".//{*}rPr")
    if rpr is None:
        return None
    attribs = {k: v for k, v in rpr.attrib.items() if k not in ("lang", "altLang")}
    attribs_tuple = tuple(sorted(attribs.items()))
    # Lấy các child element và thuộc tính của chúng (bao gồm cả thuộc tính con của con)
    def child_key(elem):
        return (
            elem.tag,
            tuple(sorted(elem.attrib.items())),
            tuple(child_key(child) for child in elem)
        )
    child_tags = tuple(child_key(child) for child in rpr)
    return (attribs_tuple, child_tags)

def merge_text_runs_in_paragraph(paragraph):
    """
    Gộp các <a:r> liên tiếp nếu có cùng format (bỏ qua lang, altLang).
    Đảm bảo <a:endParaRPr> luôn nằm cuối cùng.
    """
    runs = []
    end_para_rpr = None
    for elem in list(paragraph):
        if elem.tag.endswith('}r'):
            runs.append(elem)
        elif elem.tag.endswith('}endParaRPr'):
            end_para_rpr = elem

    if not runs:
        return

    merged_runs = []
    buffer_run = None
    buffer_text = ""
    buffer_key = None

    for run in runs:
        key = rpr_format_key(run)
        t_elem = run.find(".//{*}t")
        text = t_elem.text if t_elem is not None and t_elem.text else ""

        if buffer_run is None:
            buffer_run = run
            buffer_text = text
            buffer_key = key
        elif key == buffer_key:
            buffer_text += text
        else:
            t_elem_buf = buffer_run.find(".//{*}t")
            if t_elem_buf is not None:
                t_elem_buf.text = buffer_text
                merged_runs.append(buffer_run)
            buffer_run = run
            buffer_text = text
            buffer_key = key

    if buffer_run is not None:
        t_elem_buf = buffer_run.find(".//{*}t")
        if t_elem_buf is not None:
            t_elem_buf.text = buffer_text
            merged_runs.append(buffer_run)

    # Xóa tất cả <a:r> và <a:endParaRPr> cũ
    for elem in runs:
        paragraph.remove(elem)
    if end_para_rpr is not None:
        paragraph.remove(end_para_rpr)

    # Thêm lại các run đã gộp
    for run in merged_runs:
        paragraph.append(run)
    # Thêm lại <a:endParaRPr> (nếu có)
    if end_para_rpr is not None:
        paragraph.append(end_para_rpr)

def merge_all_paragraphs(xml_root):
    for p in xml_root.iter():
        if p.tag.endswith('}p'):
            merge_text_runs_in_paragraph(p)
def set_font_ariel_for_vietnamese(elem, slide_idx=0, is_first_text=False):
    """
    Đặt font Arial và kích thước phù hợp cho các đoạn text tiếng Việt trong <a:rPr>.
    - Slide 1: 25pt cho tất cả.
    - Text đầu tiên của mỗi slide: 14pt.
    - Còn lại: 10pt.
    """
    parent_run = elem.getparent()
    if parent_run is not None and parent_run.tag.endswith('}r'):
        rpr = parent_run.find(".//{*}rPr")
        if rpr is None:
            rpr = etree.SubElement(parent_run, "{http://schemas.openxmlformats.org/drawingml/2006/main}rPr")
        # Đặt font cho latin và cs
        latin = rpr.find(".//{*}latin")
        if latin is None:
            latin = etree.SubElement(rpr, "{http://schemas.openxmlformats.org/drawingml/2006/main}latin")
        latin.set("typeface", "Arial")
        cs = rpr.find(".//{*}cs")
        if cs is None:
            cs = etree.SubElement(rpr, "{http://schemas.openxmlformats.org/drawingml/2006/main}cs")
        cs.set("typeface", "Arial")
        # Xác định size
        if slide_idx == 0:
            sz = "2500"  # 25pt cho slide 1
        elif is_first_text:
            sz = "1400"  # 14pt cho text đầu tiên mỗi slide
        else:
            sz = "1000"  # 10pt cho còn lại
        rpr.set("sz", sz)
def translate_all_xml_in_folder(folder_path, glossary_id, source_lang, target_lang):
    for root_dir, dirs, files in os.walk(folder_path):
        for file in files:
            if not file.endswith(".xml"):
                continue

            xml_file_path = os.path.join(root_dir, file)

            # Chỉ xử lý slide chính
            rel_path = os.path.relpath(xml_file_path, folder_path).replace("\\", "/")
            if not (rel_path.startswith("ppt/slides/slide") and rel_path.endswith(".xml")):
                continue

            print(f"🔵 Đang xử lý file XML: {xml_file_path}")

            try:
                parser = etree.XMLParser(remove_blank_text=True)
                tree = etree.parse(xml_file_path, parser)
                root = tree.getroot()

                # 🔧 Ghép đoạn trước khi dịch
                merge_all_paragraphs(root)

                # Bắt đầu dịch từng đoạn văn bản
                for elem in root.iter():
                    if elem.tag.endswith("}t") and elem.text and elem.text.strip():
                        original_text = elem.text.strip()
                        try:
                            translated_text = translate_text_with_glossary(
                                original_text, glossary_id, source_lang, target_lang
                            )
                            if translated_text:
                                elem.text = html.unescape(translated_text)
                                if target_lang == "vi" or target_lang == "en":
                                    set_font_ariel_for_vietnamese(elem)
                        except Exception as e:
                            print(f"⚠️ Lỗi khi dịch đoạn text: {original_text} — {e}")

                # Ghi lại file XML
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
        output_xlsx = xlsx_file.replace(".pptx", f"_{target_lang}.pptx")
        compress_folder(extracted_folder_temp, xlsx_file, output_xlsx)

        # Xóa thư mục tạm extracted_folder_temp
        shutil.rmtree(extracted_folder_temp, ignore_errors=True)
    # Xóa thư mục tạm extracted_folder
    shutil.rmtree(extracted_folder, ignore_errors=True)

    # Xóa file zip tạm
    zip_path = xlsx_file.replace(".pptx", "_copy.zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)
    end = time.time()
    print("Total time: ", end - start)
        
        
def translate_pptx(file_path, target_lang):
    extracted_folder = copy_and_extract(file_path)

    source_lang = detect_language(extract_content(file_path))
    if source_lang == target_lang:
        raise ValueError("Source and target languages must be different.")

    pair_code = f"{source_lang}-{target_lang}" if f"{source_lang}-{target_lang}" in language_pair else f"{target_lang}-{source_lang}"
    if pair_code not in language_pair:
        raise ValueError(f"Unsupported language pair: {pair_code}")

    glossary_id = f"toray_translation_glossary_{language_pair[pair_code]}"

    extracted_folder_temp = f"{extracted_folder}_{target_lang}"
    if os.path.exists(extracted_folder_temp):
        shutil.rmtree(extracted_folder_temp)
    shutil.copytree(extracted_folder, extracted_folder_temp)

    translate_all_xml_in_folder(extracted_folder_temp, glossary_id, source_lang, target_lang)

    output_path = file_path.replace(".pptx", f"_{target_lang}.pptx")
    compress_folder(extracted_folder_temp, file_path, output_path)

    shutil.rmtree(extracted_folder_temp, ignore_errors=True)
    shutil.rmtree(extracted_folder, ignore_errors=True)

    zip_path = file_path.replace(".pptx", "_copy.zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)

    return output_path
