import { createContext, useContext, useState } from "react";
import { supabase } from "../supabase/supabaseClient";

const UserContext = createContext(null);
const KEY = "quiz_username_v1";

function loadName() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}
function saveName(name) {
  try { localStorage.setItem(KEY, name); } catch {}
}
function clearName() {
  try { localStorage.removeItem(KEY); } catch {}
}

export function UserProvider({ children }) {
  const [username, setUsername] = useState(() => loadName());

  async function login(name) {
    const trimmed = name.trim();
    if (!trimmed)        throw new Error("Digite seu nome.");
    if (trimmed.length < 2)  throw new Error("Nome muito curto (mín. 2 caracteres).");
    if (trimmed.length > 30) throw new Error("Nome muito longo (máx. 30 caracteres).");
    if (!/^[a-zA-ZÀ-ÿ0-9 _\-\.]+$/.test(trimmed))
      throw new Error("Nome contém caracteres inválidos.");

    // Checa padrões proibidos
    const { data: patterns } = await supabase
      .from("banned_names")
      .select("pattern");

    if (patterns) {
      for (const { pattern } of patterns) {
        if (trimmed.toLowerCase().includes(pattern.toLowerCase())) {
          throw new Error(`O nome "${trimmed}" não é permitido.`);
        }
      }
    }

    // Checa se usuário está banido
    const { data: user } = await supabase
      .from("users")
      .select("banned, ban_reason")
      .eq("username", trimmed)
      .maybeSingle();

    if (user?.banned) {
      throw new Error(`Conta banida. Motivo: ${user.ban_reason || "contato com o administrador."}`);
    }

    // Registra / atualiza last_seen
    await supabase.from("users").upsert(
      { username: trimmed, last_seen: new Date().toISOString() },
      { onConflict: "username" }
    );

    saveName(trimmed);
    setUsername(trimmed);
  }

  function logout() {
    clearName();
    setUsername(null);
  }

  return (
    <UserContext.Provider value={{ username, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserProvider");
  return ctx;
}