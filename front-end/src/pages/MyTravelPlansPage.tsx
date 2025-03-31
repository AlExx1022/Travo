import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import travelPlanService from '../services/travelPlanService';

// 定義旅行計劃類型
interface TravelPlan {
  id: string;
  _id?: string;  // 後端可能使用 _id 作為標識符
  planId?: string;  // 或使用 planId 作為標識符
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: string;
  travelers: number;
  created_at: string;
  updated_at: string;
}

const MyTravelPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // 狀態定義
  const [travelPlans, setTravelPlans] = useState<TravelPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [retryCount, setRetryCount] = useState<number>(0);

  // 獲取用戶的所有旅行計劃
  useEffect(() => {
    const fetchTravelPlans = async () => {
      if (!isAuthenticated) {
        console.log('用戶未認證，重定向到登入頁面');
        navigate('/login', { state: { from: '/my-travel-plans' } });
        return;
      }

      console.log('開始獲取旅行計劃數據...');
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('正在連接 API 獲取旅行計劃數據');
        const data = await travelPlanService.getUserTravelPlans();
        
        console.log('獲取到的旅行計劃數據:', data);
        
        // 確保數據是有效的
        if (data && Array.isArray(data) && data.length > 0) {
          console.log(`成功獲取 ${data.length} 個旅行計劃`);
          // 檢查並確保每個旅行計劃都有有效的 id
          const validatedPlans = data.map((plan: any) => {
            // 檢查 id 是否存在，如果不存在，記錄問題並提供備用 id
            if (!plan.id) {
              console.error('發現缺少 id 的旅行計劃:', plan);
              // 嘗試使用其他可能的 ID 字段，或生成一個臨時 ID
              plan.id = plan._id || plan.planId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              console.log('已為旅行計劃分配臨時 id:', plan.id);
            }
            return plan as TravelPlan;
          });
          setTravelPlans(validatedPlans);
          setFilteredPlans(validatedPlans);
        } else if (data && typeof data === 'object' && data.plans && Array.isArray(data.plans)) {
          console.log(`從 data.plans 獲取到 ${data.plans.length} 個旅行計劃`);
          // 也為這種格式的數據檢查 id
          const validatedPlans = data.plans.map((plan: any) => {
            if (!plan.id) {
              console.error('發現缺少 id 的旅行計劃:', plan);
              plan.id = plan._id || plan.planId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              console.log('已為旅行計劃分配臨時 id:', plan.id);
            }
            return plan as TravelPlan;
          });
          setTravelPlans(validatedPlans);
          setFilteredPlans(validatedPlans);
        } else if (Array.isArray(data) && data.length === 0) {
          // 用戶尚未創建任何旅行計劃，顯示空狀態
          console.log('用戶沒有旅行計劃');
          setTravelPlans([]);
          setFilteredPlans([]);
        } else {
          console.error('API返回的數據格式不符合預期:', data);
          setError('無法正確解析旅行計劃數據，請重試或聯繫客服');
        }
      } catch (err: any) {
        console.error('獲取旅行計劃時出錯:', err);
        
        if (err.message?.includes('未找到認證令牌')) {
          // 登入錯誤，重定向到登入頁面
          navigate('/login', { state: { from: '/my-travel-plans' } });
          return;
        }
        
        // 設置一個用戶友好的錯誤訊息
        if (err.message?.includes('請求超時')) {
          setError('連接服務器超時，可能是 API 服務器未啟動或端口設置不正確。請確認服務器狀態並重試。');
        } else if (err.message?.includes('Failed to fetch') || err.message?.includes('fetch')) {
          setError('無法連接到 API 服務器。請確認後端服務器是否運行在正確的端口 (5001)，以及是否允許跨域請求。');
        } else if (err.message?.includes('CORS') || err.message?.includes('跨域')) {
          setError('API 服務器不允許跨域請求。請確認後端 CORS 設置是否正確。');
        } else {
          setError(err.message || '無法加載旅行計劃數據，請稍後再試');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTravelPlans();
  }, [isAuthenticated, navigate, retryCount]);

  // 添加重試功能
  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  // 處理搜尋和篩選
  useEffect(() => {
    if (!travelPlans.length) return;

    // 篩選邏輯
    let filtered = [...travelPlans];
    
    // 搜尋
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        plan => 
          plan.title?.toLowerCase().includes(term) || 
          plan.destination?.toLowerCase().includes(term)
      );
    }
    
    // 排序
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      // 根據不同字段排序
      switch (sortBy) {
        case 'title':
          valueA = (a.title || '').toLowerCase();
          valueB = (b.title || '').toLowerCase();
          break;
        case 'destination':
          valueA = (a.destination || '').toLowerCase();
          valueB = (b.destination || '').toLowerCase();
          break;
        case 'start_date':
          valueA = new Date(a.start_date || Date.now()).getTime();
          valueB = new Date(b.start_date || Date.now()).getTime();
          break;
        case 'updated_at':
        default:
          valueA = new Date(a.updated_at || a.created_at || Date.now()).getTime();
          valueB = new Date(b.updated_at || b.created_at || Date.now()).getTime();
          break;
      }
      
      // 升序或降序
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredPlans(filtered);
  }, [travelPlans, searchTerm, sortBy, sortDirection]);

  // 格式化日期範圍
  const formatDateRange = (startDate: string, endDate: string): string => {
    try {
      const start = new Date(startDate).toLocaleDateString('zh-TW');
      const end = new Date(endDate).toLocaleDateString('zh-TW');
      return `${start} - ${end}`;
    } catch (error) {
      console.error('格式化日期範圍錯誤:', error, {startDate, endDate});
      return `${startDate} - ${endDate}`;
    }
  };

  // 計算旅行總天數
  const calculateTripDuration = (startDate: string, endDate: string): number => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 包括起始日
    } catch (error) {
      console.error('計算旅行天數錯誤:', error, {startDate, endDate});
      return 0;
    }
  };

  // 處理排序變更
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      // 如果點擊當前排序字段，切換排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 如果點擊不同字段，設置為新字段，並默認為降序
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  // 處理創建新旅行計劃
  const handleCreateNewPlan = () => {
    navigate('/build');
  };

  // 獲取排序圖標
  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    
    return sortDirection === 'asc' 
      ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>;
  };

  // 返回搜尋和排序組件
  const renderSearchAndSort = () => {
    if (loading || error || !travelPlans.length) return null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="flex-grow mb-4 md:mb-0 md:mr-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="搜尋旅行計劃名稱或目的地..."
                className="form-input pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-gray-700 self-center mr-2">排序：</span>
            <button
              onClick={() => handleSortChange('updated_at')}
              className={`px-3 py-1.5 rounded-md flex items-center text-sm ${
                sortBy === 'updated_at' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              最近更新
              {getSortIcon('updated_at')}
            </button>
            <button
              onClick={() => handleSortChange('start_date')}
              className={`px-3 py-1.5 rounded-md flex items-center text-sm ${
                sortBy === 'start_date' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              出發日期
              {getSortIcon('start_date')}
            </button>
            <button
              onClick={() => handleSortChange('title')}
              className={`px-3 py-1.5 rounded-md flex items-center text-sm ${
                sortBy === 'title' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              名稱
              {getSortIcon('title')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 頁面標題和創建按鈕 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">我的旅行計劃</h1>
            <p className="text-gray-600">管理和查看您所有的旅行計劃</p>
          </div>
          <button
            onClick={handleCreateNewPlan}
            className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            創建新旅行計劃
          </button>
        </div>

        {/* 搜尋和篩選 */}
        {renderSearchAndSort()}

        {/* 加載中狀態 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">正在加載您的旅行計劃...</p>
          </div>
        )}

        {/* 錯誤狀態 */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">無法加載旅行計劃</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                重試
              </button>
              <button
                onClick={handleCreateNewPlan}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                創建新計劃
              </button>
              <button
                onClick={async () => {
                  // 顯示 API 診斷信息
                  try {
                    alert('正在診斷 API 連接，請稍候並查看控制台日誌...');
                    
                    const token = localStorage.getItem('travo_auth_token');
                    console.log('API 令牌存在:', !!token);
                    if (token) console.log('令牌長度:', token.length);
                    
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                    console.log('API URL:', apiUrl);
                    
                    // 使用服務中的測試方法
                    const result = await travelPlanService.testApiConnection();
                    console.log('API 連接診斷結果:', result);
                    
                    let message = '診斷結果:\n\n';
                    
                    if (result.basicConnectionOk) {
                      message += '✅ 基本 API 連接成功\n';
                    } else {
                      message += '❌ 基本 API 連接失敗\n';
                      message += `API URL: ${apiUrl}\n`;
                      message += '請檢查後端服務器是否運行在正確的端口，以及是否允許跨域請求。\n\n';
                    }
                    
                    if (result.authConnectionOk) {
                      message += '✅ 認證 API 連接成功\n';
                    } else if (token) {
                      message += '❌ 認證 API 連接失敗\n';
                      message += '請檢查認證令牌是否有效，或嘗試重新登入。\n\n';
                    } else {
                      message += '⚠️ 未嘗試認證連接 (沒有令牌)\n';
                      message += '請先登入後再試。\n\n';
                    }
                    
                    if (result.details && result.details.length > 0) {
                      message += '\n詳細診斷結果:\n';
                      result.details.forEach(detail => {
                        const statusIcon = detail.status ? (detail.status >= 200 && detail.status < 300 ? '✅' : '❌') : '⚠️';
                        message += `${statusIcon} ${detail.endpoint}: ${detail.message}\n`;
                      });
                    }
                    
                    if (result.error) {
                      message += `\n錯誤信息: ${result.error}\n`;
                    }
                    
                    alert(message);
                  } catch (err: any) {
                    console.error('診斷過程中出錯:', err);
                    alert(`診斷過程中出錯: ${err.message}`);
                  }
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
              >
                診斷 API 連接
              </button>
            </div>
          </div>
        )}

        {/* 沒有旅行計劃的狀態 */}
        {!loading && !error && filteredPlans.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            {searchTerm ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">找不到符合條件的旅行計劃</h3>
                <p className="text-gray-600 mb-6">請嘗試不同的搜尋條件或清除搜尋</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  清除搜尋條件
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">您尚未創建任何旅行計劃</h3>
                <p className="text-gray-600 mb-6">開始計劃您的第一次旅行吧！</p>
                <button
                  onClick={handleCreateNewPlan}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  創建旅行計劃
                </button>
              </>
            )}
          </div>
        )}

        {/* 旅行計劃列表 */}
        {!loading && !error && filteredPlans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id || `temp-${Math.random()}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  if (plan.id) {
                    navigate(`/travel-plans/${plan.id}`);
                  } else {
                    console.error('嘗試導航到缺少 ID 的旅行計劃', plan);
                    alert('無法查看此旅行計劃的詳情，ID 不存在。');
                  }
                }}
              >
                {/* 計劃預覽圖 - 可以根據目的地顯示不同圖片 */}
                <div className="h-40 bg-blue-100 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{plan.title || '未命名旅行計劃'}</h3>
                  
                  <div className="flex items-center text-gray-600 text-sm mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{plan.destination || '未指定目的地'}</span>
                  </div>
                  
                  {plan.start_date && plan.end_date && (
                    <div className="flex items-center text-gray-600 text-sm mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {formatDateRange(plan.start_date, plan.end_date)} ({calculateTripDuration(plan.start_date, plan.end_date)} 天)
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    {plan.updated_at || plan.created_at ? (
                      <span>最後更新: {new Date(plan.updated_at || plan.created_at).toLocaleDateString('zh-TW')}</span>
                    ) : (
                      <span>新建計劃</span>
                    )}
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                      查看詳情
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyTravelPlansPage; 