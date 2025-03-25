// API 基礎URL設置
const API_URL = 'http://localhost:5001/api';

// 本地儲存令牌的鍵
const TOKEN_KEY = 'travo_auth_token';
const USER_KEY = 'travo_user';

// 定義用戶和認證響應的接口
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user_id?: string;
  message?: string;
}

/**
 * 用戶登入
 * @param email 用戶電子郵件
 * @param password 用戶密碼
 * @returns 包含認證信息的承諾
 */
export const login = async (email: string, password: string): Promise<User> => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '登入失敗');
    }

    const data = await response.json();

    if (!data.success || !data.token) {
      throw new Error(data.message || '登入失敗');
    }

    // 保存令牌到本地存儲
    localStorage.setItem(TOKEN_KEY, data.token);

    try {
      // 從後端獲取用戶信息
      const user = await fetchUserProfile(data.token);
      
      // 構建用戶對象
      const userObject: User = {
        id: data.user_id || 'unknown',
        name: user.profile?.display_name || email.split('@')[0],  // 使用資料中的顯示名稱或郵箱前綴作為名稱
        email: email
      };
      
      // 存儲用戶信息
      localStorage.setItem(USER_KEY, JSON.stringify(userObject));
      
      return userObject;
    } catch (profileError) {
      console.error('獲取用戶資料錯誤，使用基本信息:', profileError);
      
      // 如果獲取資料失敗，創建一個基本用戶對象
      const basicUser: User = {
        id: data.user_id || 'unknown',
        name: email.split('@')[0],  // 使用郵箱前綴作為名稱
        email: email
      };
      
      localStorage.setItem(USER_KEY, JSON.stringify(basicUser));
      return basicUser;
    }
  } catch (error) {
    console.error('登入錯誤:', error);
    throw error;
  }
};

/**
 * 註冊新用戶
 * @param name 用戶名
 * @param email 電子郵件
 * @param password 密碼
 * @returns 包含註冊響應的承諾
 */
export const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        name, 
        email, 
        password,
        profile: {
          display_name: name // 確保顯示名稱設置為用戶提供的名稱
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '註冊失敗');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || '註冊失敗');
    }

    return data;
  } catch (error) {
    console.error('註冊錯誤:', error);
    throw error;
  }
};

/**
 * 登出用戶
 */
export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * 獲取當前登入用戶
 * @returns 用戶對象或 null
 */
export const getCurrentUser = (): User | null => {
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

/**
 * 獲取認證令牌
 * @returns 令牌字符串或 null
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * 檢查用戶是否已認證
 * @returns 布爾值
 */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * 獲取用戶個人資料
 * @param token 認證令牌
 * @returns 用戶資料對象
 */
const fetchUserProfile = async (token: string): Promise<any> => {
  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('獲取用戶資料失敗');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || '獲取用戶資料失敗');
    }
    
    return data.user;
  } catch (error) {
    console.error('獲取用戶資料錯誤:', error);
    throw error;
  }
}; 