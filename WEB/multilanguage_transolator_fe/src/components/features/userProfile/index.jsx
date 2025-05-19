import { useState, useEffect } from "react";
import api from "../../../services/api";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ProfileForm = () => {
  // Profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // To track if user data was changed
  const [initialData, setInitialData] = useState({});

  // Thêm lại useNavigate để điều hướng về trang chủ
  const navigate = useNavigate();

  const handleCancel = () => {
    // Refetch profile data to reset form
    fetchProfile();
    // Reset password fields
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get("/api/user/profile/", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("accessToken"),
        },
      });
      const userData = response.data;
      setFullName(userData.full_name || "");
      setEmail(userData.email || "");
      setRole(userData.role || "User");
      
      // Store initial data for comparison
      setInitialData({
        full_name: userData.full_name || "",
        email: userData.email || ""
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("Failed to load profile data.");
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    try {
      const data = {
        full_name: fullName,
        email: email
      };

      const res = await api.patch("/api/user/profile/", data, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("accessToken"),
        },
      });

      if (res.status === 200) {
        toast.success("Profile updated successfully!");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update profile");
      return false;
    }
    return false;
  };

  const handlePasswordChange = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setPasswordError("");
    setLoading(true);

    if (currentPassword === "") {
      setPasswordError("Current password cannot be empty");
      setLoading(false);
      return false;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      setLoading(false);
      return false;
    }

    try {
      const data = {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      };

      const res = await api.patch("/api/change-password/", data, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("accessToken"),
        },
      });

      if (res.status === 200) {
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setLoading(false);
        return true;
      }
    } catch (error) {
      setPasswordError(
        error.response?.data?.detail || "Failed to change password"
      );
      setLoading(false);
      return false;
    }

    setLoading(false);
    return false;
  };

  // Check if profile data has changed
  const isProfileDataChanged = () => {
    return initialData.full_name !== fullName || initialData.email !== email;
  };

  return (
    <div className="flex flex-col items-center h-full w-full bg-white p-4 rounded-2xl ">
      {/* Header section */}
      <div className="w-full rounded-lg p-4">
        <div className="text-left w-full">
          <h2 className="text-3xl font-semibold">My account</h2>
          <p className="text-gray-500 text-base">Manage profile information</p>
        </div>
      </div>

      {/* Combined profile and password section */}
      <div className=" w-full h-full  flex flex-1 justify-center p-2">
        <div className="w-4/5 ">
          {/* Grid layout for all form fields */}
          <div className="grid grid-cols-2 gap-6">
            {/* Name Field */}
            <div>
              <label className="block text-gray-600 font-medium mb-2">
                Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                  </svg>
                </span>
                <input
                  className="w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-gray-600 font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z" />
                  </svg>
                </span>
                <input
                  className="w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Role Field */}
            <div>
              <label className="block text-gray-600 font-medium mb-2">
                Role
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M6.5 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                    <path d="M4.5 0A2.5 2.5 0 0 0 2 2.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2.5A2.5 2.5 0 0 0 11.5 0h-7zM3 2.5A1.5 1.5 0 0 1 4.5 1h7A1.5 1.5 0 0 1 13 2.5v10.795a4.2 4.2 0 0 0-.776-.492C11.392 12.387 10.063 12 8 12s-3.392.387-4.224.803a4.2 4.2 0 0 0-.776.492V2.5z" />
                  </svg>
                </span>
                <input
                  className="w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg bg-gray-100"
                  value={role}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Password section header */}
            <div className="col-span-2 mt-4 ">
              <h4 className="text-xl font-semibold">Change Password</h4>
            </div>

            {/* Current Password */}
            <div>
              <label className="block text-gray-600 font-medium mb-2">
                Current Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  </svg>
                </span>
                <input
                  type="password"
                  className="w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
            </div>

            {/* Empty space for layout balance */}
            <div className="hidden sm:block"></div>

            {/* New Password */}
            <div>
              <label className="block text-gray-600 font-medium mb-2">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  </svg>
                </span>
                <input
                  type="password"
                  className="w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-gray-600 font-medium mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  </svg>
                </span>
                <input
                  type="password"
                  className="w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </div>

          {/* Password Error Message */}
          {passwordError && (
            <p className="text-red-500 text-sm mt-2">{passwordError}</p>
          )}

          {/* Combined action buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            <button
              className="border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-6 py-2 rounded-full font-medium"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="bg-[#004098] hover:bg-[#003078] text-white px-6 py-2 rounded-full font-medium"
              onClick={async () => {
                setLoading(true);
                const isChangingPassword =
                  currentPassword || newPassword || confirmPassword;
                const isChangingProfile = isProfileDataChanged();

                let success = true;

                if (isChangingProfile) {
                  const profileUpdated = await handleUpdateProfile();
                  if (!profileUpdated) {
                    success = false;
                  }
                }

                if (isChangingPassword) {
                  if (currentPassword === "") {
                    setPasswordError("Current password cannot be empty");
                    setLoading(false);
                    return;
                  }

                  if (newPassword === "") {
                    setPasswordError("New password cannot be empty");
                    setLoading(false);
                    return;
                  }

                  if (newPassword !== confirmPassword) {
                    setPasswordError(
                      "New password and confirmation do not match"
                    );
                    setLoading(false);
                    return;
                  }

                  const passwordChanged = await handlePasswordChange();
                  if (!passwordChanged) {
                    success = false;
                  }
                }

                if (success) {
                  setTimeout(() => {
                    navigate("/");
                  }, 1000);
                } else {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save change"}
            </button>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default ProfileForm;
