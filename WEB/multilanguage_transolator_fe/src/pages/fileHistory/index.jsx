import { useState, useEffect, useRef } from "react";
import {
  FiDownload,
  FiExternalLink,
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import Pagination from "../../components/Pagination";
import LoadingBar from "../../components/LoadingBar";
import api from "../../services/api";
import { notification } from "antd";
import pdfIcon from "../../assets/icons/FilePdf.png";
import wordIcon from "../../assets/icons/FileDoc.png";
import excelIcon from "../../assets/icons/FileXls.png";

const fileIcons = {
  pdf: <img src={pdfIcon} alt="PDF" className="w-[1.75rem] h-[1.75rem]" />,
  docx: <img src={wordIcon} alt="Word" className="w-[1.75rem] h-[1.75rem]" />,
  xlsx: <img src={excelIcon} alt="Excel" className="w-[1.75rem] h-[1.75rem]" />,
};

const languageMap = {
  vi: "Vietnamese",
  ja: "Japanese",
  en: "English",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)"
};

const getLanguageName = (code) => {
  return languageMap[code];
};

const FileHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("id_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tableContainerRef = useRef(null);
  const [showTranslationsModal, setShowTranslationsModal] = useState(false);
  const [selectedOriginalFile, setSelectedOriginalFile] = useState(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/translated-file/history/");
      setHistoryData(response.data);
      setError(null);
    } catch (err) {
      setError("Could not load history data. Please try again later.");
      notification.error({
        message: "Loading Error",
        description:
          "Could not load translation history. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateItemsPerPage = () => {
    if (!tableContainerRef.current) return 6;

    const rowHeight = 52;
    const tableHeaderHeight = 56;
    const tableBorderHeight = 4;
    const paginationHeight = 10;
    const safetyBuffer = 60;

    const containerHeight = tableContainerRef.current.clientHeight;

    const availableHeight =
      containerHeight -
      tableHeaderHeight -
      tableBorderHeight -
      paginationHeight -
      safetyBuffer;

    const calculatedRows = Math.max(
      1,
      Math.floor(availableHeight / rowHeight) - 1
    );

    return Math.min(calculatedRows, 15);
  };

  const getOriginalFiles = () => {
    if (!historyData || historyData.length === 0) return [];

    return historyData.map((group) => ({
      id: group.id,
      name: group.original_file_name,
      type: group.file_type,
      date: new Date(group.created_at).toLocaleDateString("en-US"),
      url: group.original_file_url,
      translations_count: group.translations.length,
      language: group.original_language,
      rawData: group,
    }));
  };
  const handleOriginalFileClick = (file) => {
    setSelectedOriginalFile(file);
    setShowTranslationsModal(true);
  };

  const handleCloseTranslationsModal = () => {
    setShowTranslationsModal(false);
    setSelectedOriginalFile(null);
  };

  const filteredFiles = getOriginalFiles()
    .filter((file) => {
      return file.name.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "id_asc":
          return a.id - b.id;
        case "id_desc":
          return b.id - a.id;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "date_asc":
          return new Date(a.date) - new Date(b.date);
        case "date_desc":
          return new Date(b.date) - new Date(a.date);
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });

  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(() => {
        const newItemsPerPage = calculateItemsPerPage();
        if (newItemsPerPage !== itemsPerPage) {
          setItemsPerPage(newItemsPerPage);
          setCurrentPage(1);
        }
      });
    };

    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current);
    }

    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [itemsPerPage]);

  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(() => {
        const newItemsPerPage = calculateItemsPerPage();
        if (newItemsPerPage !== itemsPerPage) {
          setItemsPerPage(newItemsPerPage);
          setCurrentPage(1);
        }
      });
    }
  }, [loading, historyData, searchTerm, filteredFiles.length]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const filteredItems = filteredFiles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleDownload = async (file, languageCode) => {
    const nameParts = file.name.split(".");
    const ext = nameParts.pop();
    const baseName = nameParts.join(".");
    const newFileName = languageCode
      ? `${baseName}_${languageCode}.${ext}`
      : file.name;

    try {
      const response = await fetch(file.url, { method: "GET" });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", newFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notification.error({
        message: "Lỗi tải file",
        description: "Không thể tải file. Vui lòng thử lại.",
      });
    }
  };

  const handleOpenInNewTab = (file) => {
    const fileExt = file.name.split(".").pop().toLowerCase();
    let viewerUrl;

    if (fileExt === "pdf") {
      viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
        file.url
      )}&embedded=true`;
    } else {
      viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
        file.url
      )}`;
    }

    window.open(viewerUrl, "_blank");
  };

  const handleDelete = async (fileId) => {
    try {
      await api.delete(`/api/translated-file/history/${fileId}/`);
      notification.success({
        message: "Deleted",
        description: "File has been successfully deleted from the database",
      });
      fetchHistoryData();
      setFileToDelete(null);
    } catch (err) {
      notification.error({
        message: "Error",
        description: "Could not delete file. Please try again later.",
      });
    }
  };

  const sortOptions = [
    { value: "id_asc", label: "Sort by ID (Ascending)" },
    { value: "id_desc", label: "Sort by ID (Descending)" },
    { value: "name_asc", label: "Sort by Name (A-Z)" },
    { value: "name_desc", label: "Sort by Name (Z-A)" },
    { value: "date_asc", label: "Sort by Date (Oldest)" },
    { value: "date_desc", label: "Sort by Date (Newest)" },
  ];

  return (
    <div className="flex flex-1 flex-col h-full gap-[0.25rem]">
      <div className="bg-white p-[1rem] rounded-t-lg">
        <div className="flex flex-wrap items-center justify-between gap-[1rem]">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-800">File History</h1>
          </div>

          <div className="flex flex-wrap items-center gap-[1rem]">
            <div className="relative w-[16rem]">
              <FiSearch className="absolute left-[0.75rem] top-[0.75rem] text-gray-500 z-10" />
              <input
                type="text"
                placeholder="Search"
                className="p-[0.5rem] pl-[2.5rem] border border-gray-300 rounded-full w-full bg-white text-black placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative w-[16rem]" ref={dropdownRef}>
              <div
                className="flex items-center p-[0.5rem] pl-[2.5rem] pr-[2rem] border border-gray-300 rounded-full w-full bg-white text-black cursor-pointer hover:border-gray-400 transition-colors relative"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <FiFilter className="absolute left-[0.75rem] top-[0.75rem] text-gray-500 z-10" />
                <span>
                  {
                    sortOptions.find((option) => option.value === sortOrder)
                      ?.label
                  }
                </span>
                <div className="absolute right-[0.75rem] top-[0.75rem] pointer-events-none text-gray-500">
                  {isDropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>

              {isDropdownOpen && (
                <div className="absolute mt-[0.25rem] w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                  {sortOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`p-[0.75rem] hover:bg-gray-50 cursor-pointer transition-colors ${
                        sortOrder === option.value
                          ? "bg-[#E9F9F9] text-[#3881A2] font-medium"
                          : ""
                      }`}
                      onClick={() => {
                        setSortOrder(option.value);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {option.value === sortOrder && (
                        <span className="inline-block w-[0.25rem] h-[0.25rem] bg-teal-600 rounded-full mr-[0.5rem]"></span>
                      )}
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading && <LoadingBar />}

      <div className="bg-white p-[0.5rem] rounded-b-lg flex-1 flex flex-col ">
        <div ref={tableContainerRef} className="flex-1 h-full flex flex-col">
          {error ? (
            <div className="text-center py-10 text-red-500">
              <p>{error}</p>
              <button
                onClick={fetchHistoryData}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {searchTerm
                ? "No matching results found"
                : "No files have been translated yet. Translate files to see history."}
            </div>
          ) : (
            <div className="overflow-hidden flex-1">
              <table className="w-full border-collapse bg-white rounded-lg">
                <thead>
                  <tr className="bg-[#004098CC] text-white font-bold">
                    <th className="p-[0.75rem] border-b border-gray-300 w-[5%] text-center">
                      ID
                    </th>
                    <th className="p-[0.75rem] border-b border-gray-300 w-[25%] text-center">
                      Name
                    </th>
                    <th className="p-[0.75rem] border-b border-gray-300 w-[15%] text-center">
                      Language
                    </th>
                    <th className="p-[0.75rem] border-b border-gray-300 w-[15%] text-center">
                      Translations
                    </th>
                    <th className="p-[0.75rem] border-b border-gray-300 w-[20%] text-center">
                      Date
                    </th>
                    <th className="p-[0.75rem] border-b border-gray-300 w-[20%] text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((file, index) => (
                    <tr
                      key={file.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                        index % 2 === 0 ? "bg-white" : "bg-[#F8F8F8]"
                      }`}
                      onClick={() => handleOriginalFileClick(file)}
                    >
                      <td className="p-[0.75rem] border-b border-gray-200 text-center">
                        {indexOfFirstItem + index + 1}
                      </td>
                      <td className="p-[0.75rem] border-b border-gray-200 text-center">
                        <div className="flex items-center space-x-[0.5rem] text-left">
                          {fileIcons[file.type] || <span>📄</span>}
                          <span>{file.name}</span>
                        </div>
                      </td>
                      <td className="p-[0.75rem] border-b border-gray-200 text-center">
                        {getLanguageName(file.language)}
                      </td>
                      <td className="p-[0.75rem] border-b border-gray-200 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {file.translations_count}
                        </span>
                      </td>
                      <td className="p-[0.75rem] border-b border-gray-200 text-center">
                        {file.date}
                      </td>
                      <td className="p-[0.75rem] border-b border-gray-200 text-center">
                        <div className="flex justify-center space-x-[1rem]">
                          <button
                            className="p-[0.5rem] bg-blue-100 rounded-md hover:bg-blue-200 flex items-center justify-center transition-colors"
                            title="Download"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleDownload(file, file.language);
                            }}
                          >
                            <FiDownload className="text-blue-600 w-[1.25rem] h-[1.25rem]" />
                          </button>
                          <button
                            className="p-[0.5rem] bg-green-100 rounded-md hover:bg-green-200 flex items-center justify-center transition-colors"
                            title="Open in new tab"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInNewTab(file);
                            }}
                          >
                            <FiExternalLink className="text-green-600 w-[1.25rem] h-[1.25rem]" />
                          </button>
                          <button
                            className="p-[0.5rem] bg-red-100 rounded-md hover:bg-red-200 flex items-center justify-center transition-colors"
                            title="Delete file"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFileToDelete(file);
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-red-600 w-[1.25rem] h-[1.25rem]"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && !error && filteredFiles.length > 0 && (
          <div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {showTranslationsModal && selectedOriginalFile && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={handleCloseTranslationsModal}
        >
          <div
            className="bg-white p-[1.5rem] rounded-lg shadow-xl w-11/12 max-w-6xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Translations for "{selectedOriginalFile.name}"
              </h2>
              <button
                onClick={handleCloseTranslationsModal}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-100 p-3 rounded mb-4">
              <p>
                <strong>Original File:</strong> {selectedOriginalFile.name}
              </p>
              <p>
                <strong>Language:</strong> {getLanguageName(selectedOriginalFile.language)}
              </p>
              <p>
                <strong>Date:</strong> {selectedOriginalFile.date}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg">
                <thead>
                  <tr className="bg-[#004098CC] text-white font-bold">
                    <th className="p-[0.75rem] border-b border-gray-300 w-[5%] text-center">
                      ID
                    </th>
                    <th className="p-[0.75rem] border-b border-gray-300 w-[30%] text-center">
                      Name
                    </th>
                    <th className="p-[0.75rem] border-b border-gray-300 w-[20%] text-center">
                      Language
                    </th>
                    <th className="p-[0.75rem] border-b border-gray-300 w-[20%] text-center">
                      Date
                    </th>
                    <th className="p-[0.75rem] border-b border-gray-300 w-[25%] text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOriginalFile.rawData.translations.length > 0 ? (
                    selectedOriginalFile.rawData.translations.map(
                      (translation, idx) => (
                        <tr
                          key={translation.id}
                          className={`hover:bg-gray-50 transition-colors duration-150 ${
                            idx % 2 === 0 ? "bg-white" : "bg-[#F8F8F8]"
                          }`}
                        >
                          <td className="p-[0.75rem] border-b border-gray-200 text-center">
                            {idx + 1}
                          </td>
                          <td className="p-[0.75rem] border-b border-gray-200 text-center">
                            <div className="flex items-center space-x-[0.5rem] justify-center">
                              {fileIcons[selectedOriginalFile.type] || (
                                <span>📄</span>
                              )}
                              <span>
                                {(() => {
                                  const nameParts =
                                    selectedOriginalFile.name.split(".");
                                  const ext = nameParts.pop();
                                  const baseName = nameParts.join(".");
                                  return `${baseName}_${translation.language_code}.${ext}`;
                                })()}
                              </span>
                            </div>
                          </td>
                          <td className="p-[0.75rem] border-b border-gray-200 text-center">
                            {getLanguageName(translation.language_code)}
                          </td>
                          <td className="p-[0.75rem] border-b border-gray-200 text-center">
                            {new Date(
                              translation.created_at
                            ).toLocaleDateString("en-US")}
                          </td>
                          <td className="p-[0.75rem] border-b border-gray-200 text-center">
                            <div className="flex justify-center space-x-[1rem]">
                              <button
                                className="p-[0.5rem] bg-blue-100 rounded-md hover:bg-blue-200 flex items-center justify-center transition-colors"
                                title="Download"
                                onClick={async () => {
                                  await handleDownload(
                                    {
                                      url: translation.translated_file_url,
                                      name: selectedOriginalFile.name,
                                    },
                                    translation.language_code
                                  );
                                }}
                              >
                                <FiDownload className="text-blue-600 w-[1.25rem] h-[1.25rem]" />
                              </button>
                              <button
                                className="p-[0.5rem] bg-green-100 rounded-md hover:bg-green-200 flex items-center justify-center transition-colors"
                                title="Open in new tab"
                                onClick={() => {
                                  handleOpenInNewTab({
                                    url: translation.translated_file_url,
                                    name: selectedOriginalFile.name,
                                    type: selectedOriginalFile.type,
                                  });
                                }}
                              >
                                <FiExternalLink className="text-green-600 w-[1.25rem] h-[1.25rem]" />
                              </button>
                              <button
                                className="p-[0.5rem] bg-red-100 rounded-md hover:bg-red-200 flex items-center justify-center transition-colors"
                                title="Delete file"
                                onClick={() =>
                                  setFileToDelete({
                                    id: translation.id,
                                    name: selectedOriginalFile.name,
                                  })
                                }
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-red-600 w-[1.25rem] h-[1.25rem]"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-[0.75rem] text-center text-gray-500"
                      >
                        No translations available for this file.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedFile && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.7)" }}
          onClick={() => setSelectedFile(null)}
        >
          <div
            className="bg-white p-[1.5rem] rounded-lg shadow-xl max-w-2xl w-11/12 max-h-[90vh] overflow-auto text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-[1rem]">FILE DETAILS</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white shadow-md rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-[0.75rem] border-b border-gray-300 text-center">
                      Property
                    </th>
                    <th className="p-[0.75rem] border-b border-gray-300 text-center">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="p-[0.75rem] border-b border-gray-200 text-center">
                      File Name
                    </td>
                    <td className="p-[0.75rem] border-b border-gray-200 text-center">
                      <div className="flex items-center space-x-[0.5rem] justify-center">
                        {fileIcons[selectedFile.type] || <span>📄</span>}
                        <span>{selectedFile.name}</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="bg-[#F8F8F8]">
                    <td className="p-[0.75rem] border-b border-gray-200 text-center">
                      Language
                    </td>
                    <td className="p-[0.75rem] border-b border-gray-200 text-center">
                      {selectedFile.lang}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-[0.75rem] border-b border-gray-200 text-center">
                      Date
                    </td>
                    <td className="p-[0.75rem] border-b border-gray-200 text-center">
                      {selectedFile.date}
                    </td>
                  </tr>
                  <tr className="bg-[#F8F8F8]">
                    <td className="p-[0.75rem] border-gray-200 text-center">
                      File Type
                    </td>
                    <td className="p-[0.75rem] border-gray-200 text-center">
                      {selectedFile.type?.toUpperCase() || "UNKNOWN"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-[1rem] flex justify-center space-x-[1rem]">
              <button
                className="px-[1rem] py-[0.5rem] bg-blue-500 text-white rounded flex items-center"
                onClick={async () => {
                  await handleDownload(selectedFile, selectedFile.language);
                }}
              >
                <FiDownload className="mr-[0.5rem]" /> Download
              </button>
              <button
                className="px-[1rem] py-[0.5rem] bg-green-500 text-white rounded flex items-center"
                onClick={() => handleOpenInNewTab(selectedFile)}
              >
                <FiExternalLink className="mr-[0.5rem]" /> Open in new tab
              </button>
              <button
                className="px-[1rem] py-[0.5rem] bg-red-500 text-white rounded flex items-center"
                onClick={() => setFileToDelete(selectedFile)}
              >
                Delete
              </button>
              <button
                className="px-[1rem] py-[0.5rem] bg-gray-500 text-white rounded"
                onClick={() => setSelectedFile(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {fileToDelete && (
        <div
          className="fixed inset-0 flex justify-center items-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div
            className="bg-white p-[1.5rem] rounded shadow-lg w-[24rem] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-[1rem]">Confirm Delete</h3>
            <p className="mb-[1.5rem]">
              Are you sure you want to delete the file &quot;
              {fileToDelete.name}&quot;?
            </p>
            <div className="flex justify-center space-x-[1rem]">
              <button
                className="px-[1rem] py-[0.5rem] bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => handleDelete(fileToDelete.id)}
              >
                Delete
              </button>
              <button
                className="px-[1rem] py-[0.5rem] bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setFileToDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileHistory;
