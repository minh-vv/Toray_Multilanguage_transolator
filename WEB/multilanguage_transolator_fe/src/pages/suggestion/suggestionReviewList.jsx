import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import api from "../../services/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiCheckCircle, FiAlertCircle, FiEdit2 } from "react-icons/fi";
import Pagination from "../../components/Pagination";

const SuggestionReviewList = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [allSuggestions, setAllSuggestions] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const containerRef = useRef(null);

  // Calculate items per page based on container height
  const calculateItemsPerPage = (height) => {
    const rowHeight = 55; // Reduced from 80px to 55px to account for actual row height
    const headerHeight = 48; // Adjusted header height
    const paginationHeight = 40; // Adjusted pagination height
    const padding = 16; // Reduced padding to use more space

    const availableHeight = height - headerHeight - paginationHeight - padding;
    const calculatedItems = Math.max(
      3,
      Math.floor(availableHeight / rowHeight)
    );
    return calculatedItems;
  };

  // Measure container and update items per page on resize
  useLayoutEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        const newItemsPerPage = calculateItemsPerPage(height);
        if (newItemsPerPage !== itemsPerPage) {
          setItemsPerPage(newItemsPerPage);
          // Reset to page 1 when changing items per page to avoid empty pages
          setCurrentPage(1);
        }
      }
    };

    // Add small delay to ensure accurate measurement after DOM updates
    const timer = setTimeout(updateContainerSize, 100);
    window.addEventListener("resize", updateContainerSize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateContainerSize);
    };
  }, []);

  // Fetch suggestions when itemsPerPage or currentPage changes
  useEffect(() => {
    fetchSuggestions();
  }, [itemsPerPage, currentPage]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/common-keyword/suggestions/");
      const filtered = res.data.filter((sug) => sug.status === "pending");
      setAllSuggestions(filtered);

      const total = Math.ceil(filtered.length / itemsPerPage);
      setTotalPages(total);

      updateDisplayedSuggestions(filtered, currentPage);
    } catch (err) {
      toast.error("Failed to fetch suggestions from server", {
        style: { backgroundColor: "red", color: "white" },
        icon: <FiAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDisplayedSuggestions = (allItems, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setSuggestions(allItems.slice(startIndex, endIndex));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    updateDisplayedSuggestions(allSuggestions, page);
  };

  const handleStartEdit = (sug) => {
    setEditingId(sug.id);
    setEditedData({ ...sug });
  };

  const handleInputChange = (field, value) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitReview = async () => {
    // Kiểm tra tất cả các trường ngôn ngữ
    const requiredFields = [
      "japanese",
      "english",
      "vietnamese",
      "chinese_traditional",
      "chinese_simplified",
    ];
    const emptyFields = requiredFields.filter(
      (field) => !editedData[field] || editedData[field].trim() === ""
    );

    if (emptyFields.length > 0) {
      toast.error(
        `Please fill in all language fields: ${emptyFields.join(", ")}`,
        {
          style: { backgroundColor: "red", color: "white" },
          icon: <FiAlertCircle />,
        }
      );
      return;
    }

    try {
      // First update the suggestion content
      await api.put(
        `/api/common-keyword/suggestions/${editingId}/review/`,
        editedData
      );

      // Then approve the suggestion
      await api.post(`/api/common-keyword/suggestions/${editingId}/approve/`);

      // Create notification for all users about the new keyword
      try {
        await api.post("/api/notifications/create/", {
          title: "New Keyword Added",
          message: `A new keyword has been added to the library.`,
          details: true,
          keyword_details: [
            {
              id: editingId,
              japanese: editedData.japanese,
              english: editedData.english,
              vietnamese: editedData.vietnamese,
              chinese_traditional: editedData.chinese_traditional,
              chinese_simplified: editedData.chinese_simplified,
            },
          ],
        });
      } catch (notificationError) {
        console.error("Failed to create notification:", notificationError);
      }

      toast.success("Successfully added to keyword library!", {
        style: { backgroundColor: "green", color: "white" },
        icon: <FiCheckCircle />,
      });
      setEditingId(null);
      fetchSuggestions();
    } catch (error) {
      console.error("Error adding to library:", error);
      toast.error("Failed to add to keyword library!", {
        style: { backgroundColor: "red", color: "white" },
        icon: <FiAlertCircle />,
      });
    }
  };

  // Thêm hàm kiểm tra tất cả các field đã được điền
  const isAllFieldsFilled = () => {
    const requiredFields = [
      "japanese",
      "english",
      "vietnamese",
      "chinese_traditional",
      "chinese_simplified",
    ];
    return requiredFields.every(
      (field) => editedData[field] && editedData[field].trim() !== ""
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 flex-col h-full gap-[0.25rem]">
        <div className="bg-white p-[1rem] rounded-t-lg">
          <div className="flex flex-wrap justify-between items-center gap-[1rem]">
            <h2 className="text-2xl font-bold text-gray-800">
              Review and Add Keywords
            </h2>
            <div>
              <span className="text-gray-500 text-base">
                <i>
                  As a Keeper, please review, complete or fix translations before
                  adding to the library
                </i>
              </span>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="bg-white p-[0.5rem] rounded-b-lg flex-1 flex flex-col"
        >
          <div className="overflow-auto flex-1">
            <table className="w-full border-collapse bg-white rounded-lg">
              <thead>
                <tr className="bg-[#004098CC] text-white font-bold">
                  <th className="p-[0.75rem] border-b border-gray-300 w-[5%] text-center">
                    No
                  </th>
                  <th className="p-[0.75rem] border-b border-gray-300 w-[15%] text-center">
                    Japanese
                  </th>
                  <th className="p-[0.75rem] border-b border-gray-300 w-[15%] text-center">
                    English
                  </th>
                  <th className="p-[0.75rem] border-b border-gray-300 w-[15%] text-center">
                    Vietnamese
                  </th>
                  <th className="p-[0.75rem] border-b border-gray-300 w-[15%] text-center">
                    Chinese (Traditional)
                  </th>
                  <th className="p-[0.75rem] border-b border-gray-300 w-[15%] text-center">
                    Chinese (Simplified)
                  </th>
                  <th className="p-[0.75rem] border-b border-gray-300 w-[10%] text-center">
                    Created By
                  </th>
                  <th className="p-[0.75rem] border-b border-gray-300 w-[10%] text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-4">
                      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden fixed top-0 left-0">
                        <div className="h-full bg-[#004098CC] animate-loading-bar"></div>
                      </div>
                    </td>
                  </tr>
                ) : suggestions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-4 text-center text-gray-500 italic"
                    >
                      No pending suggestions found.
                    </td>
                  </tr>
                ) : (
                  suggestions.map((sug, index) => (
                    <tr
                      key={sug.id}
                      className={`hover:bg-gray-50 transition-colors duration-150 ${
                        index % 2 === 0 ? "bg-white" : "bg-[#F8F8F8]"
                      }`}
                    >
                      <td className="p-[0.75rem] border-b border-gray-200 text-center">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      {[
                        "japanese",
                        "english",
                        "vietnamese",
                        "chinese_traditional",
                        "chinese_simplified",
                      ].map((field) => (
                        <td
                          key={field}
                          className="p-[0.75rem] border-b border-gray-200 text-center"
                        >
                          {editingId === sug.id ? (
                            <textarea
                              value={editedData[field] || ""}
                              onChange={(e) =>
                                handleInputChange(field, e.target.value)
                              }
                              className="w-full border-2 border-gray-300 rounded p-2 text-sm resize-y focus:border-blue-400 focus:outline-none transition-colors"
                              rows={3}
                            />
                          ) : (
                            <div className="truncate max-w-[150px] mx-auto">
                              {sug[field] || "-"}
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="p-[0.75rem] border-b border-gray-200 text-center text-sm">
                        {sug.created_by || "Anonymous"}
                      </td>
                      <td className="p-3 border-b border-gray-200 text-center">
                        {editingId === sug.id ? (
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={handleSubmitReview}
                              className={`px-3 py-1 rounded hover:bg-blue-600 text-sm cursor-pointer ${
                                isAllFieldsFilled()
                                  ? "bg-[#2F80ED] text-white"
                                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                              }`}
                              disabled={!isAllFieldsFilled()}
                            >
                              Submit
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(sug)}
                            className="px-3 py-1 bg-[#2F80ED] text-white rounded hover:bg-blue-600 text-sm cursor-pointer"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && allSuggestions.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}

          <ToastContainer
            position="top-center"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </div>
    </div>
  );
};

export default SuggestionReviewList;
