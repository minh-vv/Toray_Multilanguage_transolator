import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Header from "../Layouts/Header/index";  
import Sidebar from "../Layouts/Sidebar/index";  
import api from "../../services/api";

const Layout = () => {
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const accessToken = localStorage.getItem("access");

        if (!accessToken) {
          navigate("/login");
          return;
        }

        const res = await api.get("/api/user/profile/", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const fullName = `${res.data.first_name} ${res.data.last_name}`;
        localStorage.setItem("fullName", fullName);
        localStorage.setItem("email", res.data.email);
        localStorage.setItem("role", res.data.role);
        setRole(res.data.role); 
        window.dispatchEvent(new Event("storage"));
      } catch (error) {
        console.error(" Lỗi khi lấy thông tin user:", error);
        navigate("/login"); 
      }
    };

    fetchUserProfile();
  }, [navigate]);

  return (
    <div className="flex h-screen w-full " >
      <Sidebar />
      <div className="flex flex-col flex-1  ">
        <Header />
        <div className="flex-1 p-2 bg-[#F8F8F8] ">
          <Outlet />  
        </div>
      </div>
    </div>
  );
};

export default Layout;
