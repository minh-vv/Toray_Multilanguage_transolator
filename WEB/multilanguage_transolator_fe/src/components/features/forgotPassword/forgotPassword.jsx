import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import { toast } from "react-toastify";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // Xử lý gửi email yêu cầu khôi phục mật khẩu
  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/forgot-password/", { email });
      setEmailSent(true);
      toast.success("Reset instructions sent to your email");
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || "Failed to process your request";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý cài đặt mật khẩu mới
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!resetToken || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/reset-password/", {
        token: resetToken,
        email: email,
        password: newPassword, 
      });
      setResetSuccess(true);
      toast.success("Password reset successfully");
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || "Failed to reset password";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Hiển thị trang thành công sau khi đặt lại mật khẩu
  if (resetSuccess) {
    return (
      <>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-2">
            Password Reset Successful
          </h2>
          <p className="text-gray-600 mb-6">
            Your password has been reset successfully.
          </p>
          <Link
            to="/login"
            className="inline-block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
          >
            Return to Login
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-semibold text-center mb-6">
        {!emailSent ? "Forgot Password" : "Reset Your Password"}
      </h2>

      {!emailSent ? (
        // Step 1: Email input form
        <form onSubmit={handleSendResetEmail}>
          <div className="mb-6">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email address"
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              We'll send a password reset link to this email address.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:bg-gray-400"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <div className="text-center mt-4">
            <Link to="/login" className="text-blue-600 hover:underline text-sm">
              Return to login
            </Link>
          </div>
        </form>
      ) : (
        // Step 2: Reset token and new password form
        <form onSubmit={handleResetPassword}>
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              We've sent a password reset link to <strong>{email}</strong>.
              Please check your email and enter the code below.
            </p>

            <label
              htmlFor="resetToken"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Reset Code
            </label>
            <input
              id="resetToken"
              type="text"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the code from your email"
              required
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password"
              required
              minLength={8}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:bg-gray-400"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setEmailSent(false)}
              className="text-blue-600 hover:underline text-sm"
            >
              Try another email
            </button>
          </div>
        </form>
      )}
    </>
  );
};

export default ForgotPassword;
