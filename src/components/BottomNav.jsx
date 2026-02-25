import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const QuizIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
  </svg>
);
const AdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

export default function BottomNav() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const inQuiz = location.pathname === "/quiz";

  // Hide nav during quiz
  if (inQuiz) return null;

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>
        <HomeIcon />
        Início
      </NavLink>
      <NavLink to="/quiz" className={({ isActive }) => isActive ? "active" : ""}>
        <QuizIcon />
        Quiz
      </NavLink>
      <NavLink
        to={isAdmin ? "/admin/panel" : "/admin"}
        className={({ isActive }) => isActive || location.pathname.startsWith("/admin") ? "active" : ""}
      >
        <AdminIcon />
        Admin
      </NavLink>
    </nav>
  );
}
