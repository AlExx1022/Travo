import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/authService';

// 認證上下文類型定義
interface AuthContextType {
  user: authService.User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// 建立認證上下文
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  isAuthenticated: false
});

// 自定義 Hook 提供認證上下文的使用
export const useAuth = () => useContext(AuthContext);

// 認證提供者元件
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<authService.User | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // 初始設為 true
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // 初始化時檢查是否已有有效的登入狀態
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 檢查 localStorage 是否有令牌
        const token = authService.getToken();
        
        if (token) {
          // 獲取本地儲存的用戶資訊
          const storedUser = authService.getCurrentUser();
          
          if (storedUser) {
            // 設置認證狀態
            setUser(storedUser);
            setIsAuthenticated(true);
            console.log('已自動恢復使用者登入狀態', storedUser);
          } else {
            // 有 token 但沒有用戶資訊，嘗試獲取用戶資訊
            try {
              // 這裡可以添加對後端的驗證請求，如果有提供這種 API
              console.log('找到令牌但沒有用戶資訊，清除無效登入狀態');
              authService.logout();
            } catch (error) {
              console.error('驗證令牌失敗:', error);
              authService.logout();
            }
          }
        } else {
          console.log('未找到認證令牌，用戶未登入');
        }
      } catch (error) {
        console.error('認證初始化錯誤:', error);
        // 出錯時清除登入狀態
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // 登入函數
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const user = await authService.login(email, password);
      setUser(user);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('登入錯誤:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 註冊函數
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await authService.register(name, email, password);
      return response.success;
    } catch (error) {
      console.error('註冊錯誤:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 登出函數
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // 提供上下文值
  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      isAuthenticated 
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 