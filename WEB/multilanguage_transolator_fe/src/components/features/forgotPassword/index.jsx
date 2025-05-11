import { useState, useEffect } from "react";
import ForgotPassword from "./forgotPassword";

const images = [
  "https://www.toray.com/global/images/index_kv_06.webp",
  "https://www.toray.com/global/images/index_kv_08.webp",
  "https://www.toray.com/global/images/index_kv_04.webp",
  "https://www.toray.com/global/images/index_kv_01.webp",
  "https://www.toray.com/global/images/index_kv_05.webp",
  "https://www.toray.com/global/images/index_kv_02.webp",
];

const ForgotPasswordPage = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 relative">
      {/* Background Slideshow */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${image})` }}
          ></div>
        ))}
        <div className="absolute inset-0 bg-black opacity-30"></div>
      </div>

      {/* Header Section */}
      <header className="w-full bg-white bg-opacity-90 py-4 px-8 shadow-md z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="https://www.toray.com/global/shared/images/toray_logo.svg"
              alt="Toray Logo"
              className="h-10"
            />
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <span className="text-2xl font-semibold text-blue-900 uppercase">
              Multi-Language Translator
            </span>
          </div>
        </div>
      </header>

      {/* Main content container - full height minus header */}
      <div className="flex items-center justify-center flex-1 w-full">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md z-30 relative">
          <ForgotPassword />
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
