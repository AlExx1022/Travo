import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import BuildPage from './pages/BuildPage';
import TravelPlanPage from './pages/TravelPlanPage';
import MyTravelPlansPage from './pages/MyTravelPlansPage';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/build" element={<BuildPage />} />
          <Route path="/travel-plans/:planId" element={<TravelPlanPage />} />
          <Route path="/my-travel-plans" element={<MyTravelPlansPage />} />
          {/* 以後可以添加更多路由 */}
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
