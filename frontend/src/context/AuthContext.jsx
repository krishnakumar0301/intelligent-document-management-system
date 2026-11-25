import { createContext, useContext, useEffect, useState } from 'react';
import { getProfile, login as apiLogin, register as apiRegister } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fileoracle_token');
    if (token) {
      getProfile()
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('fileoracle_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await apiLogin({ username, password });
    localStorage.setItem('fileoracle_token', res.data.access_token);
    const profile = await getProfile();
    setUser(profile.data);
    return profile.data;
  };

  const register = async (data) => {
    await apiRegister(data);
    return login(data.username, data.password);
  };

  const logout = () => {
    localStorage.removeItem('fileoracle_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
