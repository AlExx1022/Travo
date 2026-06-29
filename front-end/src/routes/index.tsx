import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = lazy(() => import('../pages/HomePage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const BuildPage = lazy(() => import('../pages/BuildPage'));
const TravelPlanPage = lazy(() => import('../pages/TravelPlanPage'));
const MyTravelPlansPage = lazy(() => import('../pages/MyTravelPlansPage'));
const ExplorePage = lazy(() => import('../pages/ExplorePage'));
const ViewTravelPlanPage = lazy(() => import('../pages/ViewTravelPlanPage'));

const PageLoader = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
  </div>
);

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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* 公開路由 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/plans/view/:planId" element={<ViewTravelPlanPage />} />
        <Route path="/travel-plan/:planId" element={<ViewTravelPlanPage />} />

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
    </Suspense>
  );
};

export default AppRoutes; 