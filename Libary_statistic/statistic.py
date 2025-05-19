import pandas as pd
from itertools import combinations

# Danh sách cột ngôn ngữ
languages = ["English", "Japanese", "Vietnamese", "Chinese"]
def pair_statistic(input_path):
    """Thống kê từng sheet cặp ngôn ngữ, tính xác suất suggest của cặp từ"""
    df = pd.read_excel(input_path)  
    total_rows = len(df)
    output_path = input_path.replace('.xlsx', "_pairs.xlsx")

    # Tạo file Excel mới để ghi
    with pd.ExcelWriter(output_path) as writer:
        # Tạo tất cả các cặp ngôn ngữ
        for lang1, lang2 in combinations(languages, 2):
            # Lấy 2 cột dữ liệu cần thiết
            pair_df = df[[lang1, lang2]].copy()
            pair_df.columns = [lang1, lang2]
            
            # Đếm số lần xuất hiện và sắp xếp giảm dần
            pair_counts = (
                pair_df
                .value_counts()
                .reset_index(name="Count")
            )
            pair_counts["Percentage"] = (pair_counts["Count"] / total_rows * 100).round(2)

            # Lọc các dòng có phần trăm > 2
            filtered = pair_counts[pair_counts["Percentage"] > 2]
    
            # Sắp xếp giảm dần
            filtered = filtered.sort_values(by="Percentage", ascending=False)
            # Đặt tên sheet
            sheet_name = f"{lang1}-{lang2}"
            
            # Ghi sheet ra file Excel
            filtered.to_excel(writer, sheet_name=sheet_name, index=False)
    return output_path

def suggestion_statistic(input_path):
    """Gộp 6 sheet lại thành 1 sheet gồm 4 cột ngôn ngữ"""
    # Mở file Excel đầu vào
    pair_statistic_path = pair_statistic(input_path)
    excel = pd.ExcelFile(pair_statistic_path)
    output_file = input_path.replace(".xlsx", "_prefill.xlsx")
    
    all_rows = []

    for sheet_name in excel.sheet_names:
        df = excel.parse(sheet_name)
        
        # Lấy tên cặp ngôn ngữ từ tên sheet, ví dụ: English-Vietnamese
        lang1, lang2 = sheet_name.split("-")

        # Chuẩn hóa tên cột đầu vào
        df.columns = ["Lang1", "Lang2", "Count", "Percentage"]

        for _, row in df.iterrows():
            new_row = {"English": "", "Japanese": "", "Vietnamese": "", "Chinese": ""}
            new_row[lang1] = row["Lang1"]
            new_row[lang2] = row["Lang2"]
            all_rows.append(new_row)

    # Tạo DataFrame mới
    final_df = pd.DataFrame(all_rows)

    # Xuất ra file Excel mới
    final_df.to_excel(output_file, index=False)
if __name__ == "__main__":
    user_suggestion_file = r"C:\Users\User\OneDrive - Hanoi University of Science and Technology\Documents\Lập trình cơ bản\Projects\[ISE] Toray translator project\Libary_statistic\suggestion.xlsx"
    suggestion_statistic(user_suggestion_file)