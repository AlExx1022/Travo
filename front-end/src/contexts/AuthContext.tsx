import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser, isAuthenticated as checkAuth } from '../services/authService';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// 創建上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 上下文提供器組件
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 在組件加載時檢查本地存儲中是否有用戶會話
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        if (checkAuth()) {
          const currentUser = getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          }
        }
      } catch (error) {
        console.error('驗證錯誤:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // 登入功能
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const loggedInUser = await apiLogin(email, password);
      setUser(loggedInUser);
      return true;
    } catch (error) {
      console.error('登入錯誤:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 註冊功能
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await apiRegister(name, email, password);
      
      if (response.success) {
        // 註冊成功後自動登入
        try {
          const loggedInUser = await apiLogin(email, password);
          setUser(loggedInUser);
          return true;
        } catch (loginError) {
          console.error('註冊後登入失敗:', loginError);
          // 即使登入失敗，註冊仍然是成功的
          return true; 
        }
      }
      
      return false;
    } catch (error) {
      console.error('註冊錯誤:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 登出功能
  const logout = () => {
    apiLogout();
    setUser(null);
    navigate('/login');
  };

  const authContextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定義鉤子，方便訪問上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必須在 AuthProvider 內部使用');
  }
  return context;
};

export default AuthContext; 