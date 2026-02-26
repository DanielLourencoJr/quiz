import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { QuizProvider } from "./contexts/QuizContext";
import { UserProvider, useUser } from "./contexts/UserContext";
import BottomNav from "./components/BottomNav";
import Toast from "./components/Toast";
import LoginName from "./pages/LoginName";
import Home from "./pages/Home";
import QuizPage from "./pages/QuizPage";
import Results from "./pages/Results";
import Ranking from "./pages/Ranking";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import AddQuestion from "./pages/AddQuestion";
import EditQuestion from "./pages/EditQuestion";

function AppRoutes() {
  const { username } = useUser();

  if (!username) return <LoginName />;

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/results" element={<Results />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/panel" element={<AdminPanel />} />
        <Route path="/admin/add" element={<AddQuestion />} />
        <Route path="/admin/edit/:id" element={<EditQuestion />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AuthProvider>
        <QuizProvider>
          <AppRoutes />
        </QuizProvider>
      </AuthProvider>
    </UserProvider>
  );
}
