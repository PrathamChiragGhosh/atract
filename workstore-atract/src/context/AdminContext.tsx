import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminContextType {
  isAuthenticated: boolean;
  adminUser: string | null;
  login: (userId: string, password: string) => boolean;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Dummy credentials
const VALID_CREDENTIALS = {
  userId: 'admin',
  password: 'admin123'
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);

  useEffect(() => {
    const storedAuth = localStorage.getItem('atract-admin-auth');
    if (storedAuth) {
      const { isAuthenticated, adminUser } = JSON.parse(storedAuth);
      setIsAuthenticated(isAuthenticated);
      setAdminUser(adminUser);
    }
  }, []);

  const login = (userId: string, password: string): boolean => {
    if (userId === VALID_CREDENTIALS.userId && password === VALID_CREDENTIALS.password) {
      setIsAuthenticated(true);
      setAdminUser(userId);
      localStorage.setItem('atract-admin-auth', JSON.stringify({ isAuthenticated: true, adminUser: userId }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAdminUser(null);
    localStorage.removeItem('atract-admin-auth');
  };

  return (
    <AdminContext.Provider value={{ isAuthenticated, adminUser, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
