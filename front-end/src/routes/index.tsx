import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 頁面組件
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import BuildPage from '../pages/BuildPage';
import TravelPlanPage from '../pages/TravelPlanPage';
import MyTravelPlansPage from '../pages/MyTravelPlansPage';

// 受保護的路由組件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">正在載入...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// 應用路由
const AppRoutes: React.FC = () => {
  const { loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">正在載入認證資訊...</div>;
  }
  
  return (
    <Routes>
      {/* 公開路由 */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* 受保護的路由 */}
      <Route path="/build" element={
        <ProtectedRoute>
          <BuildPage />
        </ProtectedRoute>
      } />
      <Route path="/travel-plans/:planId" element={
        <ProtectedRoute>
          <TravelPlanPage />
        </ProtectedRoute>
      } />
      <Route path="/my-travel-plans" element={
        <ProtectedRoute>
          <MyTravelPlansPage />
        </ProtectedRoute>
      } />
      
      {/* 沒有匹配的路由會重定向到首頁 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes; 