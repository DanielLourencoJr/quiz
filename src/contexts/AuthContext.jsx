import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const ADMIN_KEY = "quiz_admin_session";
const PASS_KEY  = "quiz_admin_password";
const DEFAULT_PASS = "admin123";

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    try { return sessionStorage.getItem(ADMIN_KEY) === "true"; }
    catch { return false; }
  });

  function getPassword() {
    return localStorage.getItem(PASS_KEY) || DEFAULT_PASS;
  }

  function login(password) {
    if (password === getPassword()) {
      sessionStorage.setItem(ADMIN_KEY, "true");
      setIsAdmin(true);
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(ADMIN_KEY);
    setIsAdmin(false);
  }

  function changePassword(current, next) {
    if (current !== getPassword()) return false;
    localStorage.setItem(PASS_KEY, next);
    return true;
  }

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
