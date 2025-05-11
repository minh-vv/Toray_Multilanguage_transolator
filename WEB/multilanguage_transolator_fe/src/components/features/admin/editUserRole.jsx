import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";

const EditUserRole = ({ isOpen, onClose, userId }) => {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("User");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUser();
    }
  }, [isOpen, userId]);

  const fetchUser = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await api.get(`/api/user/${userId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setFirstName(response.data.first_name);
      setLastName(response.data.last_name);
      setEmail(response.data.email);
      setRole(response.data.role);
    } catch (error) {
      console.error(" Lỗi khi lấy thông tin user:", error);
      setError("Không thể tải thông tin người dùng.");
    } finally {
      setDataLoading(false);
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const accessToken = localStorage.getItem("accessToken");

      await api.patch(
        `/api/user/${userId}/update-role/`,
        { role },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success("Cập nhật thành công!");

      const currentUserEmail = localStorage.getItem("email");
      if (email === currentUserEmail) {
        localStorage.setItem("role", role);
        window.dispatchEvent(new Event("storage"));
      }

      onClose();
    } catch (error) {
      console.error("Lỗi khi cập nhật vai trò:", error);
      toast.error("Không thể cập nhật vai trò.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1000]">
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="bg-white rounded-lg p-8 w-full max-w-2xl relative shadow-2xl transform transition-all">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
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

        <div className="text-left mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Edit User Role</h2>
          <p className="text-gray-500">Manage user role information</p>
        </div>

        {dataLoading ? (
          <p className="text-center text-blue-600">Đang tải dữ liệu...</p>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : (
          <div className="space-y-6">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  First Name
                </label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                  value={firstName}
                  disabled
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Last Name
                </label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                  value={lastName}
                  disabled
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Email
              </label>
              <input
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                value={email}
                disabled
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Role
              </label>
              <div className="flex flex-wrap gap-4">
                {["User", "Admin", "Library Keeper"].map((r) => (
                  <label
                    key={r}
                    className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={role === r}
                      onChange={() => setRole(r)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default EditUserRole;
