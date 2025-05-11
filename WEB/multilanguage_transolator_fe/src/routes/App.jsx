import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/login/index";
import RegisterPage from "../pages/register/index";
import HomePage from "../pages/home"; 
import NotFound from "../pages/error/notFound"; 
import ProtectedRoute from "../services/ProtectedRoute";
import MyProfile from "../pages/profile/index";
import AccountManagement from "../pages/Admin/AccountManagement"; 
import EditUserRole from "../components/features/admin/editUserRole"; 
import Layout from "../components/Layouts/layout";
import CommonLibraryManagement from '../pages/Admin/CommonLibraryManagement';
import FileHistory from "../pages/fileHistory";
import ForgotPasswordPage from "../components/features/forgotPassword/index";
import SuggestionReviewList from "../pages/suggestion/suggestionReviewList";
import TranslationResults from "../pages/translationResults";

function Logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("fullName");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
  return <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ProtectedRoute> <HomePage /> </ProtectedRoute>} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/admin/edit-user/:id" element={<EditUserRole />} />
          <Route path="/admin" element={<AccountManagement />} />
          <Route path="/translation-results" element={<ProtectedRoute><TranslationResults /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
          <Route path="/common-library" element={<CommonLibraryManagement />} />
          <Route path="/file-history" element={<FileHistory />} />
          <Route path="/suggestion-review" element={<SuggestionReviewList />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
