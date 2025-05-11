import { useState, useEffect } from "react";
import api from "../../../services/api";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// Custom hook for profile management
const useProfile = () => {
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    role: "",
  });
  const [initialData, setInitialData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/api/user/profile/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const userData = response.data;
      setProfile({
        fullName: userData.full_name || "",
        email: userData.email || "",
        role: userData.role || "User",
      });
      setInitialData({
        full_name: userData.full_name || "",
        email: userData.email || "",
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("Failed to load profile data.");
    }
  };

  const updateProfile = async (data) => {
    try {
      const res = await api.patch("/api/user/profile/", data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
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

  return {
    profile,
    setProfile,
    initialData,
    loading,
    setLoading,
    fetchProfile,
    updateProfile,
  };
};

// Custom hook for password management
const usePassword = () => {
  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = () => {
    if (!password.current) {
      setError("Current password cannot be empty");
      return false;
    }
    if (!password.new) {
      setError("New password cannot be empty");
      return false;
    }
    if (password.new !== password.confirm) {
      setError("New password and confirmation do not match");
      return false;
    }
    return true;
  };

  const changePassword = async () => {
    if (!validatePassword()) return false;

    try {
      const res = await api.patch(
        "/api/change-password/",
        {
          current_password: password.current,
          new_password: password.new,
          confirm_password: password.confirm,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (res.status === 200) {
        toast.success("Password changed successfully!");
        setPassword({ current: "", new: "", confirm: "" });
        setError("");
        return true;
      }
    } catch (error) {
      setError(error.response?.data?.detail || "Failed to change password");
      return false;
    }
    return false;
  };

  return {
    password,
    setPassword,
    error,
    loading,
    setLoading,
    changePassword,
  };
};

// Form Field Component
const FormField = ({ label, icon, value, onChange, type = "text", placeholder, disabled = false }) => (
  <div>
    <label className="block text-gray-600 font-medium mb-2">{label}</label>
    <div className="relative">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
        {icon}
      </span>
      <input
        type={type}
        className={`w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg ${
          disabled ? "bg-gray-100" : ""
        }`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  </div>
);

const ProfileForm = () => {
  const navigate = useNavigate();
  const {
    profile,
    setProfile,
    initialData,
    loading: profileLoading,
    setLoading: setProfileLoading,
    fetchProfile,
    updateProfile,
  } = useProfile();

  const {
    password,
    setPassword,
    error: passwordError,
    loading: passwordLoading,
    setLoading: setPasswordLoading,
    changePassword,
  } = usePassword();

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCancel = () => {
    fetchProfile();
    setPassword({ current: "", new: "", confirm: "" });
  };

  const isProfileDataChanged = () => {
    return initialData.full_name !== profile.fullName || initialData.email !== profile.email;
  };

  const handleSave = async () => {
    setProfileLoading(true);
    setPasswordLoading(true);

    const isChangingPassword = password.current || password.new || password.confirm;
    const isChangingProfile = isProfileDataChanged();

    let success = true;

    if (isChangingProfile) {
      const profileUpdated = await updateProfile({
        full_name: profile.fullName,
        email: profile.email,
      });
      if (!profileUpdated) success = false;
    }

    if (isChangingPassword) {
      const passwordChanged = await changePassword();
      if (!passwordChanged) success = false;
    }

    if (success) {
      setTimeout(() => navigate("/"), 1000);
    }

    setProfileLoading(false);
    setPasswordLoading(false);
  };

  return (
    <div className="flex flex-col items-center h-full w-full bg-white p-4 rounded-2xl">
      <div className="w-full rounded-lg p-4">
        <div className="text-left w-full">
          <h2 className="text-3xl font-semibold">My account</h2>
          <p className="text-gray-500 text-base">Manage profile information</p>
        </div>
      </div>

      <div className="w-full h-full flex flex-1 justify-center p-2">
        <div className="w-4/5">
          <div className="grid grid-cols-2 gap-6">
            <FormField
              label="Name"
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" /></svg>}
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
            />

            <FormField
              label="Email"
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z" /></svg>}
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />

            <FormField
              label="Role"
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6.5 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /><path d="M4.5 0A2.5 2.5 0 0 0 2 2.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2.5A2.5 2.5 0 0 0 11.5 0h-7zM3 2.5A1.5 1.5 0 0 1 4.5 1h7A1.5 1.5 0 0 1 13 2.5v10.795a4.2 4.2 0 0 0-.776-.492C11.392 12.387 10.063 12 8 12s-3.392.387-4.224.803a4.2 4.2 0 0 0-.776.492V2.5z" /></svg>}
              value={profile.role}
              disabled
            />

            <div className="col-span-2 mt-4">
              <h4 className="text-xl font-semibold">Change Password</h4>
            </div>

            <FormField
              label="Current Password"
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /></svg>}
              type="password"
              value={password.current}
              onChange={(e) => setPassword({ ...password, current: e.target.value })}
              placeholder="Enter current password"
            />

            <div className="hidden sm:block"></div>

            <FormField
              label="New Password"
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /></svg>}
              type="password"
              value={password.new}
              onChange={(e) => setPassword({ ...password, new: e.target.value })}
              placeholder="Enter new password"
            />

            <FormField
              label="Confirm New Password"
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /></svg>}
              type="password"
              value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>

          {passwordError && (
            <p className="text-red-500 text-sm mt-2">{passwordError}</p>
          )}

          <div className="flex justify-center space-x-4 mt-8">
            <button
              className="border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-6 py-2 rounded-full font-medium"
              onClick={handleCancel}
              disabled={profileLoading || passwordLoading}
            >
              Cancel
            </button>
            <button
              className="bg-[#004098] hover:bg-[#003078] text-white px-6 py-2 rounded-full font-medium"
              onClick={handleSave}
              disabled={profileLoading || passwordLoading}
            >
              {profileLoading || passwordLoading ? "Saving..." : "Save change"}
            </button>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default ProfileForm;
