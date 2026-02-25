import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { QuizProvider } from "./contexts/QuizContext";
import BottomNav from "./components/BottomNav";
import Toast from "./components/Toast";
import Home from "./pages/Home";
import QuizPage from "./pages/QuizPage";
import Results from "./pages/Results";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import AddQuestion from "./pages/AddQuestion";
import EditQuestion from "./pages/EditQuestion";

export default function App() {
  return (
    <AuthProvider>
      <QuizProvider>
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/quiz"       element={<QuizPage />} />
          <Route path="/results"    element={<Results />} />
          <Route path="/admin"      element={<AdminLogin />} />
          <Route path="/admin/panel"  element={<AdminPanel />} />
          <Route path="/admin/add"    element={<AddQuestion />} />
          <Route path="/admin/edit/:id" element={<EditQuestion />} />
          <Route path="*"           element={<Navigate to="/" />} />
        </Routes>
        <BottomNav />
        <Toast />
      </QuizProvider>
    </AuthProvider>
  );
}
