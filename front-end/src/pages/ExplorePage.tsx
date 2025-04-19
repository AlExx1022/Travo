import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import travelPlanService from '../services/travelPlanService';
import Header from '../components/Header';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { MapIcon } from '@heroicons/react/24/outline';

// 定義旅行計畫類型
interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  is_public: boolean;
  cover_image?: string;
  user_id: string;
  username?: string;
  created_at?: string;
  _id?: string; // 添加 _id 屬性以符合 API 返回格式
  budget?: string; // 添加預算欄位
  travelers?: number; // 添加旅行人數欄位
  days?: any[]; // 添加旅行天數欄位
  hasValidId?: boolean; // 標記此計劃是否有有效 ID
  activities?: any[]; // 添加活動欄位，支持不同結構的 API 返回
  photos?: string[] | any[]; // 添加照片欄位，支持字符串或物件陣列
}

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth(); // 獲取用戶信息和認證狀態
  const [travelPlans, setTravelPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'destination'>('newest');
  
  // 分頁與搜索相關狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<TravelPlan[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const plansPerPage = 9; // 每頁顯示的計畫數量
  
  // 添加環境變數檢測
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // 添加預設目的地圖片映射
  const destinationImages: Record<string, string> = {
    '東京': 'https://source.unsplash.com/featured/?tokyo,japan',
    '京都': 'https://source.unsplash.com/featured/?kyoto,japan',
    '大阪': 'https://source.unsplash.com/featured/?osaka,japan',
    '紐約': 'https://source.unsplash.com/featured/?newyork,usa',
    '倫敦': 'https://source.unsplash.com/featured/?london,uk',
    '巴黎': 'https://source.unsplash.com/featured/?paris,france',
    '羅馬': 'https://source.unsplash.com/featured/?rome,italy',
    '香港': 'https://source.unsplash.com/featured/?hongkong',
    '台北': 'https://source.unsplash.com/featured/?taipei,taiwan',
    '新加坡': 'https://source.unsplash.com/featured/?singapore',
    '首爾': 'https://source.unsplash.com/featured/?seoul,korea',
    '曼谷': 'https://source.unsplash.com/featured/?bangkok,thailand',
    '悉尼': 'https://source.unsplash.com/featured/?sydney,australia',
    '上海': 'https://source.unsplash.com/featured/?shanghai,china',
    '北京': 'https://source.unsplash.com/featured/?beijing,china',
    '阿姆斯特丹': 'https://source.unsplash.com/featured/?amsterdam,netherlands',
  };
  
  // 根據目的地獲取預設圖片
  const getDefaultImageForDestination = useCallback((destination: string): string => {
    // 如果有完全匹配的目的地
    if (destinationImages[destination]) {
      return destinationImages[destination];
    }
    
    // 檢查目的地是否包含已知的城市名稱
    for (const [key, imageUrl] of Object.entries(destinationImages)) {
      if (destination.includes(key)) {
        return imageUrl;
      }
    }
    
    // 如果沒有匹配，返回基於目的地名稱的通用旅行照片
    return `https://source.unsplash.com/featured/?travel,${encodeURIComponent(destination)}`;
  }, [destinationImages]);
  
  useEffect(() => {
    fetchPublicTravelPlans();
  }, [currentPage, sortOption]); // 當頁碼或排序選項變化時重新獲取數據

  // 從行程活動中直接提取預覽圖片 - 使用更簡單的 MyTravelPlansPage 方式
  const getPreviewImage = useCallback((plan: TravelPlan): string | null => {
    // 首先檢查封面圖片（ExplorePage 特有的邏輯）
    if (plan.cover_image) {
      // 處理相對路徑
      if (plan.cover_image.startsWith('/')) {
        return `${window.location.origin}${plan.cover_image}`;
      }
      return plan.cover_image;
    }
    
    // 首先檢查 days 陣列中的活動（與 MyTravelPlansPage 一致的邏輯）
    if (plan.days && Array.isArray(plan.days) && plan.days.length > 0) {
      for (const day of plan.days) {
        if (day.activities && Array.isArray(day.activities) && day.activities.length > 0) {
          for (const activity of day.activities) {
            if (activity.photos && Array.isArray(activity.photos) && activity.photos.length > 0) {
              let photoUrl = activity.photos[0];
              
              // 處理字符串或對象格式的照片
              if (typeof photoUrl === 'string') {
                if (photoUrl.startsWith('/')) {
                  const fullUrl = `${window.location.origin}${photoUrl}`;
                  return fullUrl;
                }
                return photoUrl;
              } else if (typeof photoUrl === 'object' && photoUrl !== null) {
                // 處理 photo_reference 或 url 屬性
                if (photoUrl.url) {
                  return photoUrl.url;
                }
                if (photoUrl.photo_url) {
                  return photoUrl.photo_url;
                }
                if (photoUrl.image_url) {
                  return photoUrl.image_url;
                }
              }
            }
          }
        }
      }
    }
    
    // 然後檢查 activities 陣列（與 MyTravelPlansPage 一致的邏輯）
    if (plan.activities && Array.isArray(plan.activities) && plan.activities.length > 0) {
      for (const activity of plan.activities) {
        if (activity.photos && Array.isArray(activity.photos) && activity.photos.length > 0) {
          let photoUrl = activity.photos[0];
          
          // 處理字符串或對象格式的照片
          if (typeof photoUrl === 'string') {
            if (photoUrl.startsWith('/')) {
              const fullUrl = `${window.location.origin}${photoUrl}`;
              return fullUrl;
            }
            return photoUrl;
          } else if (typeof photoUrl === 'object' && photoUrl !== null) {
            // 處理 photo_reference 或 url 屬性
            if (photoUrl.url) {
              return photoUrl.url;
            }
            if (photoUrl.photo_url) {
              return photoUrl.photo_url;
            }
            if (photoUrl.image_url) {
              return photoUrl.image_url;
            }
          }
        }
      }
    }
    
    // 如果都沒有找到照片，返回 null
    return null;
  }, []);

  // 移除特定計劃的調試函數
  useEffect(() => {
    // 調試代碼已移除
  }, [travelPlans, getPreviewImage]);

  // 重置搜索
  const resetSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
    setSearchExecuted(false);
    setCurrentPage(1);
    fetchPublicTravelPlans();
  };

  // 獲取公開旅行計畫
  const fetchPublicTravelPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await travelPlanService.getPublicTravelPlans({
        page: currentPage,
        limit: 9,
        sortBy: sortOption,
        sortOrder: 'asc',
        includePhotos: true,
        includeActivities: true
      });

      // 處理不同的 API 回應格式
      let plansArray: any[] = [];
      let totalItems = 0;
      let currentPageFromResponse = currentPage;
      
      if (Array.isArray(response)) {
        plansArray = response;
        totalItems = response.length;
      } else if (response && typeof response === 'object') {
        if (response.plans && Array.isArray(response.plans)) {
          plansArray = response.plans;
          totalItems = response.total || response.plans.length;
          currentPageFromResponse = response.page || currentPage;
        } else {
          // 嘗試處理其他可能的格式
          const possiblePlansData = Object.values(response).find(value => Array.isArray(value));
          if (possiblePlansData) {
            plansArray = possiblePlansData;
            totalItems = possiblePlansData.length;
          } else {
            // 如果response本身就是一個單一的計劃對象，將其轉換為陣列
            if (response.title && (response.days || response.activities)) {
              plansArray = [response];
              totalItems = 1;
            }
          }
        }
      }
      
      // 確保每個計劃都有有效的 ID
      const processedPlans = plansArray.map((plan: any) => {
        let hasRealId = false;
        let finalId = '';
        
        // 嘗試從多個可能的 ID 字段中獲取
        if (plan.id && typeof plan.id === 'string' && plan.id.trim() !== '') {
          finalId = plan.id;
          hasRealId = true;
        } else if (plan._id && typeof plan._id === 'string' && plan._id.trim() !== '') {
          finalId = plan._id;
          hasRealId = true;
        } else if (plan.planId && typeof plan.planId === 'string' && plan.planId.trim() !== '') {
          finalId = plan.planId;
          hasRealId = true;
        } else if (plan.plan_id && typeof plan.plan_id === 'string' && plan.plan_id.trim() !== '') {
          finalId = plan.plan_id;
          hasRealId = true;
        } else if (plan._id && typeof plan._id === 'object' && plan._id.$oid) {
          // 處理 MongoDB 風格的 ObjectId
          finalId = plan._id.$oid;
          hasRealId = true;
        } else {
          // 生成臨時 ID
          finalId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          console.warn('使用臨時 ID 替代缺失的 ID:', finalId);
        }
        
        // 處理可能的 MongoDB 日期欄位
        if (plan.created_at && typeof plan.created_at === 'object' && plan.created_at.$date) {
          plan.created_at = plan.created_at.$date;
        }
        if (plan.updated_at && typeof plan.updated_at === 'object' && plan.updated_at.$date) {
          plan.updated_at = plan.updated_at.$date;
        }
        
        // 處理嵌套的 user_id
        if (plan.user_id && typeof plan.user_id === 'object' && plan.user_id.$oid) {
          plan.user_id = plan.user_id.$oid;
        }
        
        // 預處理圖片URL - 如果是相對路徑，轉換為絕對路徑
        if (plan.cover_image && plan.cover_image.startsWith('/')) {
          plan.cover_image = `${window.location.origin}${plan.cover_image}`;
        }
        
        // 確保 days 陣列正確
        if (plan.days && Array.isArray(plan.days)) {
          // 檢查並處理 days 陣列中的 activities
          plan.days = plan.days.map((day: any) => {
            if (day.activities && Array.isArray(day.activities)) {
              // 處理每個活動的照片 URL
              day.activities = day.activities.map((activity: any) => {
                if (activity.photos && Array.isArray(activity.photos)) {
                  // 轉換 Google Maps API 的照片 URL
                  activity.photos = activity.photos.map((photo: any) => {
                    if (typeof photo === 'string') {
                      // 處理 Google Maps PhotoService.GetPhoto URL
                      if (photo.includes('maps.googleapis.com') && photo.includes('PhotoService.GetPhoto')) {
                        // 這些 URL 需要保持原樣，不需要轉換
                        return photo;
                      }
                      
                      // 處理相對路徑
                      if (photo.startsWith('/')) {
                        return `${window.location.origin}${photo}`;
                      }
                    }
                    return photo;
                  });
                }
                return activity;
              });
            }
            return day;
          });
        }
        
        return {
          ...plan,
          id: finalId,
          hasValidId: hasRealId
        };
      });
      
      // 檢查是否有計劃但沒有有效 ID
      if (processedPlans.length > 0 && !processedPlans.some(plan => plan.hasValidId)) {
        console.warn('API 返回的所有計畫都缺少有效 ID，使用臨時 ID 顯示');
        toast('部分計畫缺少有效識別碼，部分功能可能受限', {
          icon: '⚠️',
          duration: 5000,
          style: {
            background: '#FFF3CD',
            color: '#856404'
          }
        });
      }
      
      // 設置總計劃數量和頁碼
      setTotalPages(Math.ceil(totalItems / plansPerPage));
      setCurrentPage(currentPageFromResponse);
      
      setTravelPlans(processedPlans);
      
      // 如果不是在搜索模式，也更新搜索結果
      if (!isSearching) {
        setSearchResults(processedPlans);
      }
      
    } catch (err: any) {
      console.error('獲取旅行計劃時出錯:', err);
      setError(err.message || '獲取旅行計劃時出錯');
      setTravelPlans([]);
      if (!isSearching) {
        setSearchResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // 處理搜索功能
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      resetSearch();
      return;
    }
    
    setIsSearching(true);
    setSearchExecuted(true);
    
    try {
      setLoading(true);
      
      // 在前端進行簡單搜索
      // 實際應用中可能需要將搜索邏輯移至後端API
      const filteredPlans = travelPlans.filter(plan => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (
          plan.title.toLowerCase().includes(lowerCaseSearchTerm) ||
          plan.destination.toLowerCase().includes(lowerCaseSearchTerm) ||
          (plan.description && plan.description.toLowerCase().includes(lowerCaseSearchTerm))
        );
      });
      
      setSearchResults(filteredPlans);
    } catch (err: any) {
      console.error('搜索旅行計畫時出錯:', err);
      setError(err.message || '搜索旅行計畫時出錯');
    } finally {
      setLoading(false);
    }
  };

  // 處理排序邏輯
  const handleSortChange = (option: 'newest' | 'oldest' | 'destination') => {
    setSortOption(option);
    
    // 如果當前在搜索模式，對搜索結果進行排序
    if (isSearching) {
      const sorted = sortPlans([...searchResults], option);
      setSearchResults(sorted);
    }
  };

  // 排序邏輯
  const sortPlans = (plans: TravelPlan[], sortType: 'newest' | 'oldest' | 'destination') => {
    switch (sortType) {
      case 'newest':
        return plans.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
      case 'oldest':
        return plans.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateA - dateB;
        });
      case 'destination':
        return plans.sort((a, b) => a.destination.localeCompare(b.destination));
      default:
        return plans;
    }
  };

  // 獲取當前要顯示的計畫列表
  const getDisplayedPlans = () => {
    if (isSearching) {
      return searchResults;
    }
    return travelPlans;
  };

  // 計算旅行天數
  const calculateTravelDays = (plan: TravelPlan) => {
    if (plan.days && Array.isArray(plan.days)) {
      return plan.days.length;
    }
    
    // 如果沒有 days 屬性，根據開始和結束日期計算
    try {
      const startDate = new Date(plan.start_date);
      const endDate = new Date(plan.end_date);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays + 1; // 包含開始和結束當天
    } catch (err) {
      return "未知";
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const formatOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      
      return `${start.toLocaleDateString('zh-TW', formatOptions)} — ${end.toLocaleDateString('zh-TW', formatOptions)}`;
    } catch (err) {
      console.error('日期格式化出錯:', err);
      return '日期無效';
    }
  };

  // 處理查看詳情
  const handleViewPlan = (plan: TravelPlan) => {
    if (!plan.hasValidId) {
      toast.error('無法查看此計畫詳情，因為它缺少有效識別碼', {
        duration: 3000
      });
      return;
    }
    navigate(`/plans/view/${plan.id}`);
  };

  // 處理編輯計畫
  const handleEditPlan = (e: React.MouseEvent, planId: string) => {
    e.stopPropagation(); // 防止觸發卡片的點擊事件
    
    if (!isAuthenticated || !user) {
      toast.error('請先登入才能編輯計畫');
      return;
    }
    
    // 有效 ID，導航到計畫編輯頁
    navigate(`/travel-plans/${planId}`);
  };

  // 分頁處理
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo(0, 0); // 回到頁面頂部
  };

  // 渲染分頁按鈕
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center mt-8">
        <nav className="inline-flex rounded-md shadow">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${
              currentPage === 1 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            上一頁
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-4 py-2 text-sm font-medium ${
                page === currentPage
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${
              currentPage === totalPages
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            下一頁
          </button>
        </nav>
      </div>
    );
  };

  if (loading && !searchExecuted) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
          <p className="ml-3 text-gray-600">加載中...</p>
        </div>
      </>
    );
  }

  const displayedPlans = getDisplayedPlans();

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">探索旅行計畫</h1>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleSortChange('newest')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                sortOption === 'newest' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              最新
            </button>
            <button
              onClick={() => handleSortChange('oldest')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                sortOption === 'oldest' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              最舊
            </button>
            <button
              onClick={() => handleSortChange('destination')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                sortOption === 'destination' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              目的地
            </button>
          </div>
        </div>
        
        {/* 搜索功能 */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋標題、目的地或描述..."
              className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                搜尋
              </button>
              {isSearching && (
                <button
                  onClick={resetSearch}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition duration-200"
                >
                  清除
                </button>
              )}
            </div>
          </div>
          {isSearching && (
            <p className="mt-2 text-sm text-gray-600">
              找到 {searchResults.length} 個符合條件的旅行計畫
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <strong className="font-bold">出錯了！</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {displayedPlans.length === 0 && !loading ? (
          <div className="text-center py-10">
            {isSearching ? (
              <div>
                <p className="text-xl text-gray-600">找不到與「{searchTerm}」相關的旅行計畫。</p>
                <button
                  onClick={resetSearch}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200"
                >
                  查看所有計畫
                </button>
              </div>
            ) : (
              <p className="text-xl text-gray-600">目前沒有公開的旅行計畫。</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPlans.map(plan => (
              <div key={plan.id} className="bg-white shadow-md rounded-lg overflow-hidden h-60 relative group hover:shadow-xl transition-shadow duration-300">
                {/* 圖片部分 */}
                {(() => {
                  // 使用封面圖片、活動圖片或基於目的地的預設圖片
                  const imageUrl = plan.cover_image || getPreviewImage(plan) || getDefaultImageForDestination(plan.destination);
                  const isDefaultImage = !plan.cover_image && !getPreviewImage(plan);
                  
                  return (
                    <>
                      {imageUrl ? (
                        <>
                          <div className="h-40 w-full relative">
                            <div 
                              className="h-full w-full bg-center bg-cover"
                              style={{ backgroundImage: `url('${imageUrl}')` }}
                            ></div>
                            
                            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/70 to-transparent">
                              <h3 className="absolute bottom-2 left-4 text-white font-semibold text-lg">{plan.destination}</h3>
                              {!plan.cover_image && !isDefaultImage && (
                                <span className="absolute bottom-2 right-4 text-xs text-white bg-blue-500 px-2 py-1 rounded">活動預覽</span>
                              )}
                              {isDefaultImage && (
                                <span className="absolute bottom-2 right-4 text-xs text-white bg-yellow-500 px-2 py-1 rounded">目的地預覽</span>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* 沒有圖片時的自定義設計 */}
                          <div className="h-40 bg-blue-100 flex flex-col items-center justify-center p-4">
                            <MapIcon className="h-16 w-16 text-blue-500 mb-2" />
                            <h3 className="text-blue-600 font-bold text-xl text-center">{plan.destination}</h3>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}

                {/* 計劃信息部分 */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-1 truncate">{plan.title}</h3>
                  <p className="text-xs text-gray-500">{formatDateRange(plan.start_date, plan.end_date)} · {calculateTravelDays(plan)} 天</p>
                </div>

                {/* 讓整個卡片可點擊 */}
                <div className="absolute inset-0 cursor-pointer" onClick={() => handleViewPlan(plan)}></div>
              </div>
            ))}
          </div>
        )}
        
        {/* 分頁控制 */}
        {!isSearching && renderPagination()}
      </div>
      
      {/* Toast 通知 */}
      <Toaster position="bottom-right" />
    </>
  );
};

export default ExplorePage; 