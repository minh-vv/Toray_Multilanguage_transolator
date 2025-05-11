import { useState, useEffect, useRef } from "react";
import { IoMdNotifications } from "react-icons/io";
import ReactDOM from 'react-dom';
import api from "../../services/api";

// Helper function to check if two dates are within the specified weeks of each other
const isWithinTimeframe = (date1, date2, weeks = 2) => {
  const timeDifference = Math.abs(new Date(date1) - new Date(date2));
  const dayDifference = timeDifference / (1000 * 60 * 60 * 24);
  return dayDifference <= weeks * 7; // Convert weeks to days
};

// Group notifications by time periods
const groupNotificationsByTime = (notifications) => {
  if (!notifications.length) return [];
  
  // Sort by creation date (newest first)
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  
  const groups = [];
  let currentGroup = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    // Compare with the first item in current group (newest in group)
    if (isWithinTimeframe(sorted[i].created_at, currentGroup[0].created_at)) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push([...currentGroup]);
      currentGroup = [sorted[i]];
    }
  }
  
  // Don't forget the last group
  if (currentGroup.length) {
    groups.push(currentGroup);
  }
  
  return groups;
};

const Notifications = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const notificationBtnRef = useRef(null);
  const [notificationPosition, setNotificationPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    // Fetch notifications on load and every 30 seconds
    fetchNotifications();
    const notificationInterval = setInterval(fetchNotifications, 30000);

    return () => {
      clearInterval(notificationInterval);
    };
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (notificationBtnRef.current) {
        const rect = notificationBtnRef.current.getBoundingClientRect();
        setNotificationPosition({
          top: rect.bottom + window.scrollY + 10, // 10px below the button
          right: window.innerWidth - rect.right, // Align with the right edge of the button
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [showNotifications]);

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications || showDetailPopup) {
        const target = event.target;
        if (
          !target.closest(".notification-menu") &&
          !target.closest(".keyword-details-popup")
        ) {
          setShowNotifications(false);
          if (!target.closest(".keyword-details-button")) {
            setShowDetailPopup(false);
          }
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showNotifications, showDetailPopup]);

  const fetchNotifications = async () => {
    try {
      // Replace with your actual API endpoint for notifications
      const response = await api.get("/api/notifications/");

      // Sort notifications by date (newest first)
      const sortedNotifications = response.data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      // Group all keyword notifications (not just 'keyword_update' type)
      const groupedNotifications = [];
      
      // Find all keyword-related notifications (including "New Keyword Added")
      const keywordNotifications = sortedNotifications.filter(
        (n) => n.type === "keyword_update" || 
               n.title?.includes("Keyword") || 
               n.message?.includes("keyword") ||
               n.message?.includes("library")
      );
      
      // Group keyword notifications by time period (1-2 weeks)
      const keywordTimeGroups = groupNotificationsByTime(keywordNotifications);
      
      // Create a consolidated notification for each time group
      keywordTimeGroups.forEach(group => {
        if (group.length === 0) return;
        
        // Get the most recent date for this group
        const latestDate = group[0].created_at;
        
        // Consolidate all keyword details from this time group
        const allKeywordDetails = group.flatMap(
          (n) => n.keyword_details || []
        );
        
        // If there are missing keyword_details for some notifications, create placeholders
        if (allKeywordDetails.length < group.length) {
          group.forEach(n => {
            if (!n.keyword_details) {
              // Try to extract keyword data from title/message
              let japanese = "", english = "";
              if (n.title?.includes("Keyword") && n.message) {
                // Try to find the keyword in the message
                english = n.message.replace("A new keyword has been added to the library.", "").trim();
              }
              
              if (japanese || english) {
                allKeywordDetails.push({
                  japanese,
                  english,
                  vietnamese: "",
                  chinese_traditional: "",
                  chinese_simplified: ""
                });
              }
            }
          });
        }
        
        const isAllRead = group.every((n) => n.read);
        const timeRange = formatDate(group[group.length-1].created_at) + " - " + formatDate(latestDate);
        
        // Create consolidated notification for this time group
        const consolidatedNotification = {
          id: "consolidated-keywords-" + Date.now() + "-" + group[0].id,
          title: "Keyword Updates",
          message: `${allKeywordDetails.length} keywords have been updated (${timeRange})`,
          created_at: latestDate,
          read: isAllRead,
          details: true,
          type: "keyword_update",
          keyword_details: allKeywordDetails.length > 0 ? allKeywordDetails : undefined,
          original_notifications: group // Keep original IDs for marking as read
        };
        
        groupedNotifications.push(consolidatedNotification);
      });
      
      // Add other non-keyword notifications
      const otherNotifications = sortedNotifications.filter(
        (n) => !(n.type === "keyword_update" || 
                n.title?.includes("Keyword") || 
                n.message?.includes("keyword") ||
                n.message?.includes("library"))
      );
      
      groupedNotifications.push(...otherNotifications);

      setNotifications(groupedNotifications);

      // Count unread notifications
      const unread = groupedNotifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      // If it's a consolidated notification, mark all original notifications as read
      const notification = notifications.find(n => n.id === notificationId);
      
      if (notification && notification.original_notifications) {
        // Mark all original keyword notifications as read
        for (const originalNotification of notification.original_notifications) {
          if (!originalNotification.read) {
            await api.post(`/api/notifications/${originalNotification.id}/read/`);
          }
        }

        // Update local state
        setNotifications(
          notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
      } else {
        // Standard single notification
        await api.post(`/api/notifications/${notificationId}/read/`);
        
        // Update local state to mark as read
        setNotifications(
          notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
      }

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const ensureKeywordUpdateTimes = (notification) => {
    if (!notification || !notification.keyword_details) return notification;
    
    // Deep clone to avoid mutating the original
    const updatedNotification = { ...notification };
    
    // Make sure each keyword has an update time
    updatedNotification.keyword_details = notification.keyword_details.map(keyword => {
      // If the keyword doesn't have an update time, try to find it from its original notification
      if (!keyword.updated_at && notification.original_notifications) {
        const matchingNotification = notification.original_notifications.find(n => 
          n.keyword_details?.some(k => 
            k.japanese === keyword.japanese && 
            k.english === keyword.english
          )
        );
        
        if (matchingNotification) {
          return {
            ...keyword,
            updated_at: matchingNotification.created_at
          };
        }
      }
      
      return keyword;
    });
    
    return updatedNotification;
  };

  const handleShowDetails = (notification) => {
    setSelectedNotification(ensureKeywordUpdateTimes(notification));
    setShowDetailPopup(true);
  };

  // Use portal to render notifications outside of the component hierarchy
  const NotificationPortal = ({ children }) => {
    const portalRoot = document.getElementById('root') || document.body;
    const element = document.createElement('div');
    element.style.position = 'fixed';
    element.style.top = '0';
    element.style.left = '0';
    element.style.width = '100%';
    element.style.height = '100%';
    // Adjust z-index based on whether details popup is showing
    element.style.zIndex = showDetailPopup ? '2147483646' : '2147483647'; // Lower z-index when details popup is shown
    element.style.pointerEvents = 'none';
    
    useEffect(() => {
      document.body.classList.add('overflow-hidden');
      portalRoot.appendChild(element);
      return () => {
        document.body.classList.remove('overflow-hidden');
        portalRoot.removeChild(element);
      };
    }, [element, portalRoot]);
    
    return ReactDOM.createPortal(
      <div style={{ pointerEvents: 'none', width: '100%', height: '100%', position: 'relative' }}>
        {children}
      </div>,
      element
    );
  };
  
  // Portal for the details popup with improved z-index and backdrop
  const PopupPortal = ({ children }) => {
    const portalRoot = document.getElementById('root') || document.body;
    const element = document.createElement('div');
    element.style.position = 'fixed';
    element.style.top = '0';
    element.style.left = '0';
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.zIndex = '2147483647'; // Always use highest possible z-index
    element.style.display = 'flex';
    element.style.justifyContent = 'center';
    element.style.alignItems = 'center';
    element.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; // Darker backdrop
    // Add slight animation for better visual hierarchy
    element.style.animation = 'fadeIn 0.2s ease-out';
    
    useEffect(() => {
      document.body.classList.add('overflow-hidden');
      portalRoot.appendChild(element);
      return () => {
        document.body.classList.remove('overflow-hidden');
        portalRoot.removeChild(element);
      };
    }, [element, portalRoot]);
    
    return ReactDOM.createPortal(children, element);
  };

  return (
    <>
      <div
        ref={notificationBtnRef}
        className="notification-menu relative inline-flex items-center cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setShowNotifications(!showNotifications);
        }}
        style={{ zIndex: '100' }}
      >
        <div className="relative">
          <IoMdNotifications
            size={24}
            className="text-gray-600 hover:text-gray-900"
          />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Notification Dropdown - Using Portal */}
        {showNotifications && (
          <NotificationPortal>
            <div 
              style={{ 
                position: 'absolute',
                top: `${notificationPosition.top}px`, 
                right: `${notificationPosition.right}px`,
                width: '320px',
                maxWidth: 'calc(100vw - 24px)',
                pointerEvents: 'auto',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                borderRadius: '16px',
                background: 'white',
                animation: 'fadeIn 0.2s ease-out'
              }}
              className="bg-white border border-gray-100 rounded-2xl shadow-md overflow-hidden"
            >
              <div className="p-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  <ul className="flex flex-col">
                    {notifications.map((notification) => (
                      <li
                        key={notification.id}
                        className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${
                          !notification.read ? "bg-blue-50" : ""
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm">
                            {notification.title}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {(notification.details || notification.keyword_details) && (
                          <div className="mt-2">
                            <button
                              className="keyword-details-button text-xs text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowDetails(notification);
                              }}
                            >
                              Show Details
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </NotificationPortal>
        )}
      </div>

      {/* Keyword Details Popup - Using Portal with improved layering */}
      {showDetailPopup && selectedNotification && (
        <PopupPortal>
          <div 
            className="keyword-details-popup bg-white p-6 rounded-lg shadow-xl max-w-5xl w-11/12 max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'fadeInScale 0.3s ease-out',
              boxShadow: '0 16px 32px rgba(0, 0, 0, 0.25), 0 8px 16px rgba(0, 0, 0, 0.2)',
              transform: 'translateY(0)', // Start with no transform
              opacity: 1, // Start fully visible
              position: 'relative', // Ensure it's positioned properly
              zIndex: 2147483647 // Ensure maximum z-index within the portal
            }}
          >
            <h3 className="text-lg text-[#004098CC] font-bold mb-4">
              KEYWORD UPDATE DETAILS
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white shadow-md rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[#004098CC] text-white">
                    <th className="p-3 border-b border-r border-gray-300 text-center w-[5%]">
                      No
                    </th>
                    <th className="p-3 border-b border-r border-gray-300 text-center w-[15%]">
                      Japanese
                    </th>
                    <th className="p-3 border-b border-r border-gray-300 text-center w-[15%]">
                      English
                    </th>
                    <th className="p-3 border-b border-r border-gray-300 text-center w-[15%]">
                      Vietnamese
                    </th>
                    <th className="p-3 border-b border-r border-gray-300 text-center w-[15%]">
                      Chinese (Traditional)
                    </th>
                    <th className="p-3 border-b border-r border-gray-300 text-center w-[15%]">
                      Chinese (Simplified)
                    </th>
                    <th className="p-3 border-b border-gray-300 text-center w-[15%]">
                      Update Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedNotification.keyword_details?.map((keyword, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-[#F8F8F8]"}>
                      <td className="p-3 border-b border-r border-gray-200 text-center">
                        {index + 1}
                      </td>
                      <td className="p-3 border-b border-r border-gray-200 text-center">
                        {keyword.japanese || ""}
                      </td>
                      <td className="p-3 border-b border-r border-gray-200 text-center">
                        {keyword.english || ""}
                      </td>
                      <td className="p-3 border-b border-r border-gray-200 text-center">
                        {keyword.vietnamese || ""}
                      </td>
                      <td className="p-3 border-b border-r border-gray-200 text-center">
                        {keyword.chinese_traditional || ""}
                      </td>
                      <td className="p-3 border-b border-r border-gray-200 text-center">
                        {keyword.chinese_simplified || ""}
                      </td>
                      <td className="p-3 border-b border-gray-200 text-center">
                        {formatDate(keyword.updated_at || selectedNotification.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
                onClick={() => setShowDetailPopup(false)}
                style={{
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  transform: 'translateY(0)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </PopupPortal>
      )}

      {/* Add global styles for animations */}
      <style jsx global>{`
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default Notifications;
