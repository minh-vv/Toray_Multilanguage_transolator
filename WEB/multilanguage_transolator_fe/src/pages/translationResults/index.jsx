import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import { Spin, notification, Button } from "antd";
import { FaDownload, FaSave } from "react-icons/fa";
import { FiX } from "react-icons/fi";

const TranslationResults = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { originalFile, originalLanguage, translatedFiles } = state || {};
  const [selectedLanguage, setSelectedLanguage] = useState("");

  useEffect(() => {
    if (!originalFile || !translatedFiles) {
      notification.error({
        message: "Error",
        description: "No translation data provided.",
      });
      setLoading(false);
      return;
    }
    setSelectedLanguage(translatedFiles[0].language);
    setLoading(false);
  }, [originalFile, translatedFiles]);

  const viewHistory = () => {
    navigate("/file-history");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Spin size="large" />
        <p className="mt-[1rem] text-lg">Translating your document...</p>
        <p className="text-sm text-gray-500">This may take a few moments.</p>
      </div>
    );
  }

  const getViewerSrc = (uri) => {
    const ext = uri.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(
        uri
      )}&embedded=true`;
    } else if (["docx", "xlsx", "pptx"].includes(ext)) {
      return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
        uri
      )}`;
    }
    return uri;
  };

  const selectedFile = translatedFiles.find(
    (f) => f.language === selectedLanguage
  );
  const downloadUrl = selectedFile?.url;

  const openInNewTab = () => {
    const viewerUrl = getViewerSrc(selectedFile.url);
    window.open(viewerUrl, "_blank");
  };

  const getLanguageName = (code) => {
    const languageMap = {
      ja: "Japanese",
      "zh-CN": "Chinese (Simplified)",
      "zh-TW": "Chinese (Traditional)",
      en: "English",
      vi: "Vietnamese",
      // Add other languages as needed
    };

    return languageMap[code] || code;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-full w-full flex flex-col bg-white rounded-2xl ">
        {/* Language Selection Panel */}
        <div className="flex flex-row p-4 gap-2 relative">
          {/* Origin Language Button */}
          <button className="bg-[#F0F7FF] border border-[#0066CC] rounded-full px-6 py-2 flex items-center justify-center text-sm w-48 shadow-sm hover:bg-[#E6F0FF] transition-colors duration-200">
            <span className="mx-auto text-[#0066CC]">
              {getLanguageName(originalLanguage)} (Original)
            </span>
          </button>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Target Languages */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {translatedFiles.map((file) => (
              <button
                key={file.language}
                onClick={() => setSelectedLanguage(file.language)}
                className={`rounded-full px-6 py-2 flex items-center justify-center text-sm shadow-sm border transition-colors duration-200 whitespace-nowrap
                  ${
                    file.language === selectedLanguage
                      ? "bg-[#004098] text-white border-[#004098] hover:bg-[#002e6e]"
                      : "bg-[#F0F7FF] text-[#0066CC] border-[#0066CC] hover:bg-[#E6F0FF]"
                  }
                `}
              >
                <span>{getLanguageName(file.language)}</span>
              </button>
            ))}
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-2 ml-2">
            <button
              className="p-[0.5rem] bg-[#004098] text-white rounded-full hover:bg-[#002e6e] flex items-center justify-center transition-colors"
              onClick={viewHistory}
              title="View History"
            >
              <FaSave className="w-[1rem] h-[1rem]" />
            </button>
            {downloadUrl && (
              <a href={downloadUrl} download>
                <button
                  className="p-[0.5rem] bg-[#004098] text-white rounded-full hover:bg-[#002e6e] flex items-center justify-center transition-colors"
                  title="Download"
                >
                  <FaDownload className="w-[1rem] h-[1rem]" />
                </button>
              </a>
            )}
            <button
              className="p-[0.5rem] bg-[#004098] text-white rounded-full hover:bg-[#002e6e] flex items-center justify-center transition-colors"
              onClick={() => navigate("/")}
              title="Close"
            >
              <FiX className="w-[1rem] h-[1rem]" />
            </button>
          </div>
        </div>

        {/* Viewer Panel */}
        <div className="flex-1 px-[1rem] pb-[1rem] relative">
          <div className="flex flex-1 h-full flex-col lg:flex-row gap-[1rem]">
            <div className="flex-1 h-full rounded overflow-auto">
              <iframe
                src={getViewerSrc(originalFile.uri)}
                className="w-full h-full"
                frameBorder="0"
                title="Original Viewer"
                scrolling="auto"
                style={{ overflow: "auto" }}
              />
            </div>
            <div className="flex-1 h-full rounded overflow-auto relative">
              <iframe
                src={getViewerSrc(selectedFile.url)}
                className="w-full h-full"
                frameBorder="0"
                title="Translated Viewer"
                scrolling="auto"
                style={{ overflow: "auto" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationResults;
