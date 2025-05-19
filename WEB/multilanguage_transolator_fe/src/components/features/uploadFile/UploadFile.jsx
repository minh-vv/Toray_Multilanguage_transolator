import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { notification, Spin } from "antd";
import LanguageSelector from "./LanguageSelector";

const LANGUAGE_CODES = {
  English: "en",
  Japanese: "ja",
  "Chinese (Simplified)": "zh-CN",
  "Chinese (Traditional)": "zh-TW",
  Vietnamese: "vi",
};

const UploadFile = () => {
  const [translating, setTranslating] = useState(false);
  const [selectedOriginLanguage, setSelectedOriginLanguage] =
    useState("Origin Language");
  const [availableTargetLanguages, setAvailableTargetLanguages] = useState([
    "English",
    "Japanese",
    "Chinese (Simplified)",
    "Chinese (Traditional)",
    "Vietnamese",
  ]);
  const [selectedTargetLanguages, setSelectedTargetLanguages] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tempFileData, setTempFileData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (uploadProgress === 100 && tempFileData) {
      setFile({
        uri: tempFileData.publicUrl,
        fileType: tempFileData.fileType,
        docxUrl: tempFileData.docxUrl,
        originalFileName: tempFileData.originalFileName,
      });
      setTempFileData(null);
    }
  }, [uploadProgress, tempFileData]);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length > 0) {
      uploadFile(selectedFiles[0]);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      uploadFile(droppedFiles[0]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const uploadFile = async (fileToUpload) => {
    const ext = fileToUpload.name.split(".").pop()?.toLowerCase();
    const allowedFormats = ["pdf", "docx", "xlsx", "pptx"];

    if (!ext || !allowedFormats.includes(ext)) {
      notification.error({
        message: "Invalid Format",
        description: "Only PDF, DOCX, XLSX, and PPTX are supported.",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fakeProgressInterval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          if (prevProgress < 95) {
            return prevProgress + 5;
          }
          return prevProgress;
        });
      }, 500);

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const response = await api.post("/api/upload-to-s3/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const { publicUrl, docxUrl, conversionError } = response.data;
      clearInterval(fakeProgressInterval);
      setUploadProgress(100);

      if (ext === "pdf" && docxUrl) {
        notification.success({
          message: "PDF Conversion Success",
          description:
            "File PDF đã được chuyển đổi thành DOCX để cải thiện kết quả dịch.",
          duration: 4,
        });
      }

      if (conversionError) {
        notification.warning({
          message: "PDF Conversion Warning",
          description:
            "File PDF của bạn đã được tải lên nhưng không thể chuyển đổi sang DOCX. " +
            "Kết quả dịch có thể không tối ưu. Chi tiết: " +
            conversionError,
          duration: 6,
        });
      }

      setTempFileData({
        publicUrl,
        fileType: ext,
        docxUrl: docxUrl,
        originalFileName: fileToUpload.name,
      });

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      notification.error({
        message: "Upload Failed",
        description:
          "An error occurred while uploading the file: " +
          (error.response?.data?.error || error.message),
      });
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadProgress(0);
  };

  const handleTranslateClick = async () => {
    if (!file) {
      notification.error({
        message: "No File Selected",
        description: "Vui lòng upload file trước khi dịch.",
      });
      return;
    }
    if (selectedOriginLanguage === "Origin Language") {
      notification.error({
        message: "Origin Language Required",
        description: "Vui lòng chọn ngôn ngữ nguồn.",
      });
      return;
    }
    if (selectedTargetLanguages.length === 0) {
      notification.error({
        message: "Target Language Required",
        description: "Vui lòng chọn ít nhất 1 ngôn ngữ đích.",
      });
      return;
    }

    setTranslating(true);

    try {
      let fileUrlToTranslate = file.uri;

      if (file.fileType === "pdf" && file.docxUrl) {
        fileUrlToTranslate = file.docxUrl;
      }

      const payload = {
        file_url: fileUrlToTranslate,
        origin_language: LANGUAGE_CODES[selectedOriginLanguage],
        target_languages: selectedTargetLanguages.map((l) => LANGUAGE_CODES[l]),
        original_file_name: file.originalFileName,
      };

      console.log("Payload for translation:", payload);
      const response = await api.post("/api/translate/", payload);
      console.log("Translation response:", response.data);

      navigate("/translation-results", {
        state: {
          originalFile: file,
          originalLanguage: selectedOriginLanguage,
          translatedFiles: response.data.translated_files,
        },
      });
    } catch (error) {
      console.error("Translation error:", error);
      notification.error({
        message: "Translation Failed",
        description: error.response?.data?.detail || error.message,
      });
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white flex-1 items-center justify-center rounded-2xl relative">
      <div className="w-full rounded-t-2xl p-4">
        <div className="flex flex-row justify-between w-full">
          <LanguageSelector
            selectedOriginLanguage={selectedOriginLanguage}
            onOriginLanguageChange={setSelectedOriginLanguage}
            selectedTargetLanguages={selectedTargetLanguages}
            onTargetLanguagesChange={setSelectedTargetLanguages}
            availableTargetLanguages={availableTargetLanguages}
            onAvailableTargetLanguagesChange={setAvailableTargetLanguages}
          />
          {file && (
            <div className="flex items-center">
              <button
                onClick={handleRemoveFile}
                className="bg-[#F0F7FF] border border-[#0066CC] rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-[#E6F0FF] transition-colors ml-3"
                title="Remove file"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-[#0066CC]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 h-full w-full rounded-b-2xl items-center justify-center">
        {!file && (
          <div
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-3/5 w-[90%] bg-[#F8F8F8] rounded-lg flex flex-col items-center justify-center text-center border border-gray-300 border-dashed p-4"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {uploading ? (
              <div className="w-full flex flex-col items-center justify-center">
                <div className="relative w-36 h-36 mb-6">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#E9F9F9"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#004098"
                      strokeWidth="10"
                      strokeDasharray={`${uploadProgress * 2.51} 251`}
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-medium text-gray-700">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>

                <p className="text-[#004098] font-bold text-lg mb-4">
                  {uploadProgress}% to complete
                </p>

                <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#004098] rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2 sm:mb-4 md:mb-6">
                  <img
                    src="/assets/upload.svg"
                    alt="Upload"
                    className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] md:w-[80px] md:h-[80px] lg:w-[90px] lg:h-[90px]"
                  />
                </div>
                <p className="text-gray-700 font-medium text-base sm:text-lg lg:text-xl mb-1 sm:mb-2">
                  Choose a file or Drag and drop it here
                </p>
                <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">
                  PNG, JPG, PDF, TXT
                </p>
                <label
                  htmlFor="fileInput"
                  className="bg-[#004098] text-white text-xs sm:text-sm px-4 sm:px-6 py-1.5 sm:py-2 rounded-full cursor-pointer hover:bg-[#002e6e] transition-colors"
                >
                  Browse
                </label>
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>
        )}

        {file && (
          <div className="flex flex-col flex-1 w-[98%] rounded-lg gap-2">
            <div
              className="iframe-container flex-1"
              style={{ height: "calc(70vh - 100px)", overflow: "hidden" }}
            >
              {(file.fileType === "docx" ||
                (file.fileType === "pdf" && file.docxUrl)) && (
                <iframe
                  src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
                    file.fileType === "pdf" && file.docxUrl
                      ? file.docxUrl
                      : file.uri
                  )}`}
                  style={{ width: "100%", height: "100%" }}
                  frameBorder="0"
                  title="DOCX Viewer"
                />
              )}

              {(file.fileType === "xlsx" || file.fileType === "pptx") && (
                <iframe
                  src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
                    file.uri
                  )}`}
                  style={{ width: "100%", height: "100%" }}
                  frameBorder="0"
                  title={`${file.fileType.toUpperCase()} Viewer`}
                />
              )}

              {file.fileType === "pdf" && !file.docxUrl && (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                    file.uri
                  )}&embedded=true`}
                  style={{ width: "100%", height: "100%" }}
                  frameBorder="0"
                  title="PDF Viewer"
                />
              )}
            </div>
          </div>
        )}

        {file && (
          <div className="w-full p-2 flex justify-center">
            {translating ? (
              <Spin size="large" />
            ) : (
              <button
                className="bg-[#004098] text-white px-8 py-2.5 w-48 rounded-full shadow hover:bg-[#002e6e] transition-colors"
                onClick={handleTranslateClick}
              >
                Translate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadFile;
