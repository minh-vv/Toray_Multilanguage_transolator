import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import { Spin, notification, Button } from "antd";
import { FaDownload, FaSave } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import ArrowsLeftRight from "../../assets/icons/ArrowsLeftRight.png";

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
    return ext === "pdf"
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(
          uri
        )}&embedded=true`
      : `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
          uri
        )}`;
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
    <div className="h-full w-full flex flex-col bg-white rounded-2xl ">
      {/* Language Selection Flame/Panel */}
      <div className="flex flex-row p-4 gap-2 relative">
        {/* Origin Language Button - Left aligned */}
        <button className="bg-[#E9F9F9] border border-[#004098] rounded-full px-5 py-2 flex items-center justify-center text-sm shadow-sm">
          <span>{getLanguageName(originalLanguage)} (Original)</span>
        </button>

        {/* Icon in the middle - absolute positioned */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <img src={ArrowsLeftRight} alt="Translate" className="w-10 h-10" />
        </div>

        {/* Spacer to push items to the right */}
        <div className="flex-1"></div>

        {/* Target Languages - Right aligned */}
        <div className="flex items-center gap-2">
          {translatedFiles.map((file) => (
            <button
              key={file.language}
              onClick={() => setSelectedLanguage(file.language)}
              className={`rounded-full px-5 py-2 flex items-center justify-center text-sm shadow-sm border transition-colors ${
                file.language === selectedLanguage
                  ? "bg-[#004098] text-white border-[#004098]"
                  : "bg-[#E9F9F9] border-[#004098]"
              }`}
            >
              <span>{getLanguageName(file.language)}</span>
            </button>
          ))}
        </div>

        {/* Control buttons - Right aligned */}
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

      {/* Viewer Flame/Panel */}
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
            {/* Reposition language badge */}

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
  );
};

export default TranslationResults;
