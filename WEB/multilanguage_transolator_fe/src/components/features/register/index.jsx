import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../../constants/constants";
import { ToastContainer, toast } from "react-toastify";
import { FiAlertCircle } from "react-icons/fi";
import api from "../../../services/api";

function RegisterForm({ route }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const notifyError = (msg) =>
    toast.error(msg, {
      style: { backgroundColor: "#f44336", color: "white" },
      icon: <FiAlertCircle />,
    });

  const notifySuccess = () =>
    toast.success("Registration successful!", {
      style: { backgroundColor: "#4caf50", color: "white" },
      icon: <FiAlertCircle />,
    });

  const validateEmail = (email) => /^[\w.-]+@mail\.toray$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!validateEmail(email)) {
      notifyError("Email must have the format @mail.toray!");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      notifyError("Password confirmation doesn't match!");
      setLoading(false);
      return;
    }

    // Split full name into first and last name
    const nameParts = fullName.trim().split(" ");
    const lastName = nameParts.pop() || ""; // Last word as last name
    const firstName = nameParts.join(" ") || ""; // Rest as first name

    try {
      const data = {
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        confirm_password: confirmPassword,
      };

      const res = await api.post(route, data, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.status === 201 || res.status === 200) {
        if (res.data.access && res.data.refresh) {
          localStorage.setItem(ACCESS_TOKEN, res.data.access);
          localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
        }
        notifySuccess();
        navigate("/login");
      } else {
        notifyError("Registration failed!");
      }
    } catch (error) {
      console.error(error);
      notifyError(error.response?.data?.message || "Registration failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="text-left">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-normal mb-2">Email address</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#004098CC]"
            placeholder="example@mail.toray"
            required
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-normal mb-2">Full Name</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#004098CC]"
            placeholder="Enter your full name"
            required
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-normal mb-2">Password</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#004098CC]"
            placeholder="Enter password"
            required
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-gray-700 text-sm font-normal mb-2">Confirm Password</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#004098CC]"
            placeholder="Confirm password"
            required
          />
        </div>
      </div>

      <ToastContainer />
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={loading}
          className="w-48 py-2 bg-[#004098CC] text-white rounded-full hover:bg-[#00306E] transition font-medium"
        >
          {loading ? "Creating Account..." : "Sign up"}
        </button>
      </div>
    </form>
  );
}

export default RegisterForm;
