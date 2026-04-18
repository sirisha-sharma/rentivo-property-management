import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

// Drop half-written or legacy payloads so the UI never shows a fake "logged in" user.
const normalizeStoredUser = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const token = typeof raw.token === "string" ? raw.token.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const role = typeof raw.role === "string" ? raw.role.trim() : "";
  const id = raw._id ?? raw.id;
  const idString = id != null ? String(id).trim() : "";
  if (!token || !name || !email || !role || !idString) {
    return null;
  }
  return { ...raw, token, name, email, role, _id: idString };
};

// Central auth state provider used by the mobile app session flow.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Rehydrate user from storage so we don't flash the login screen on every launch
  const checkLoginStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        return;
      }
      const parsed = JSON.parse(userData);
      const normalized = normalizeStoredUser(parsed);
      if (normalized) {
        setUser(normalized);
      } else {
        await AsyncStorage.removeItem("user");
        setUser(null);
      }
    } catch (error) {
      console.log("Error loading user:", error);
      try {
        await AsyncStorage.removeItem("user");
      } catch (_removeError) {
        // ignore
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData) => {
    const normalized = normalizeStoredUser(userData);
    if (!normalized) {
      console.warn("login: ignored invalid user payload");
      return;
    }
    setUser(normalized);
    await AsyncStorage.setItem("user", JSON.stringify(normalized));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
