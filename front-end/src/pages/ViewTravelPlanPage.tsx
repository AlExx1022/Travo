import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import travelPlanService from '../services/travelPlanService';
import PlanMap from '../components/travel-plan/PlanMap';
import Header from '../components/Header';

// PlanMap組件需要的活動類型
interface MapActivity {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
  type: string;
  time?: string;
}

// API可能返回的各種格式的活動
interface ApiActivityV1 {
  id: string;
  title: string;
  description?: string;
  location?: string;
  location_lat?: number;
  location_lng?: number;
  start_time?: string;
  end_time?: string;
  day?: number;
  type?: string;
  photos?: string[];
}

// 數據庫中存儲的活動格式
interface DbActivity {
  id: string;
  name: string;  // 注意: 這裡用的是name而不是title
  location?: string;
  type?: string;
  time?: string;
  duration_minutes?: number;
  lat: number;  // 移除可選標記，確保與 MapActivity 匹配
  lng: number;  // 移除可選標記，確保與 MapActivity 匹配
  place_id?: string;
  address?: string;
  photos?: string[];
  description?: string;
  rating?: number;
  day?: number; // 添加日期字段，以便在活動列表中使用
  start_time?: string; // 添加開始時間，兼容舊格式
  end_time?: string; // 添加結束時間，兼容舊格式
  title?: string; // 添加 title 字段，兼容舊格式
}

// API返回的活動類型 - 支持兩種格式
type ApiActivity = ApiActivityV1 | DbActivity;

// API 返回的日期結構
interface DayData {
  day: number;
  date: string;
  activities: DbActivity[];
}

// 更新 TravelPlan 接口以兼容 travelPlanService.ts 中的定義
interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  is_public: boolean;
  cover_image?: string;
  activities: ApiActivity[];
  user_id: string;
  username?: string;
  // 添加服務可能返回的其他字段
  name?: string;
  startDate?: string; 
  endDate?: string;
  created_at?: string;
  budget?: string;
  travelers?: number;
  days?: DayData[];  // 添加對新數據結構的支持
  _id?: string; // 添加 MongoDB 的 _id 字段
}

// API 響應格式
interface ApiResponse {
  plan?: TravelPlan;
  success?: boolean;
  message?: string;
  error?: string;
  [key: string]: any;  // 允許其他可能的屬性
}

const ViewTravelPlanPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const [mapActivities, setMapActivities] = useState<MapActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 轉換API活動到地圖活動格式
  const convertToMapActivities = (activities: ApiActivity[]): MapActivity[] => {
    console.log('開始轉換活動數據:', activities);
    
    if (!activities || !Array.isArray(activities)) {
      console.warn('收到的活動數據不是陣列或為空:', activities);
      return [];
    }
    
    return activities
      .filter(activity => {
        // 檢查是否有位置數據，支持兩種不同的格式
        const hasLocation = 
          // 格式1: location_lat 和 location_lng
          (('location_lat' in activity && activity.location_lat !== undefined) && 
           ('location_lng' in activity && activity.location_lng !== undefined)) ||
          // 格式2: lat 和 lng
          (('lat' in activity && activity.lat !== undefined) && 
           ('lng' in activity && activity.lng !== undefined)); 
        
        if (!hasLocation) {
          console.warn(`活動 ${activity.id} 缺少位置數據:`, activity);
        }
        return hasLocation;
      })
      .map((activity, index) => {
        console.log(`轉換活動 ${index}:`, activity);
        
        // 創建活動對象，兼容兩種格式
        if ('lat' in activity && 'lng' in activity) {
          // 使用 DbActivity 格式
          return {
            id: activity.id,
            name: activity.name,
            lat: activity.lat,
            lng: activity.lng,
            order: index,
            type: activity.type || 'default',
            time: activity.time
          };
        } else if ('location_lat' in activity && 'location_lng' in activity) {
          // 使用 ApiActivityV1 格式
          return {
            id: activity.id,
            name: activity.title,
            lat: activity.location_lat!,
            lng: activity.location_lng!,
            order: index,
            type: activity.type || 'default',
            time: activity.start_time
          };
        } else {
          // 如果既沒有 lat/lng 也沒有 location_lat/location_lng，
          // 則創建一個默認的 MapActivity，避免 TypeScript 錯誤
          console.warn('無法識別的活動格式，使用默認值:', activity);
          return {
            id: typeof activity.id === 'string' ? activity.id : `temp-${index}`,
            name: ('location_lat' in activity && typeof activity.title === 'string') ? activity.title : 
                  ('name' in activity && typeof activity.name === 'string') ? activity.name : `未命名活動 ${index}`,
            lat: 0,
            lng: 0,
            order: index,
            type: 'default',
            time: undefined
          };
        }
      });
  };

  // 從 days 陣列中提取活動
  const extractActivitiesFromDays = (days: DayData[]): DbActivity[] => {
    if (!days || !Array.isArray(days)) {
      return [];
    }
    
    // 將所有天數中的活動整合到一個數組中
    return days.reduce((allActivities: DbActivity[], day) => {
      if (day.activities && Array.isArray(day.activities)) {
        // 確保每個活動都有基本必要的字段
        const activitiesWithDay = day.activities
          // 首先過濾掉無效的活動
          .filter(activity => activity && typeof activity === 'object')
          // 然後轉換每個活動
          .map(activity => {
            // 確保每個活動都有 id
            const activityId = activity.id || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            return {
              ...activity,
              id: activityId,
              day: day.day,
              // 確保有必需的字段，避免 TypeScript 錯誤
              lat: typeof activity.lat === 'number' ? activity.lat : 0,
              lng: typeof activity.lng === 'number' ? activity.lng : 0,
              // 如果僅有 name 則同時設置 title
              title: activity.title || activity.name,
              // 如果僅有 time 則設置為 start_time
              start_time: activity.start_time || activity.time,
              // 確保照片格式正確
              photos: Array.isArray(activity.photos) ? activity.photos : []
            } as DbActivity;
          });
        return [...allActivities, ...activitiesWithDay];
      }
      return allActivities;
    }, []);
  };

  useEffect(() => {
    if (!planId) {
      setError('找不到旅行計畫 ID');
      setLoading(false);
      return;
    }

    console.log(`準備獲取旅行計畫，ID: ${planId}`);
    console.log(`目前使用的 API URL: ${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}`);
    console.log(`當前頁面路徑: ${window.location.pathname}`);

    const fetchTravelPlan = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`正在調用 travelPlanService.getTravelPlanById(${planId})`);
        
        // 測試不同的 API 端點獲取計畫數據
        try {
          const response = await travelPlanService.getTravelPlanById(planId) as ApiResponse;
          
          if (!response) {
            console.error('獲取旅行計畫返回空數據');
            setError('找不到旅行計畫');
            return;
          }
          
          console.log('成功獲取旅行計畫數據:', response);
          
          // 檢查 response 是否有 plan 屬性，說明返回的是 {plan: {...}, success: true} 格式
          const planData = response.plan || response;
          
          if (!planData) {
            console.error('無法從回應中提取計畫數據');
            setError('數據格式錯誤');
            return;
          }
          
          console.log('原始計畫數據:', planData);
          
          // 首先確保 planData 是有效的對象
          if (typeof planData !== 'object' || planData === null) {
            console.error('計畫數據格式無效:', planData);
            setError('計畫數據格式無效');
            return;
          }
          
          // 更寬容地檢查必要字段，考慮多種可能的字段名稱
          const hasValidId = !!(
            (typeof planData.id === 'string' && planData.id.length > 0) || 
            (typeof planData._id === 'string' && planData._id.length > 0)
          );
          const hasValidTitle = !!(
            (typeof planData.title === 'string' && planData.title.length > 0) || 
            (typeof planData.name === 'string' && planData.name.length > 0)
          );
          const hasValidDestination = !!(typeof planData.destination === 'string' && planData.destination.length > 0);
          const hasValidDates = !!(
            (typeof planData.start_date === 'string' && planData.start_date.length > 0) || 
            (typeof planData.startDate === 'string' && planData.startDate.length > 0)
          );
          
          if (!hasValidDestination) {
            console.error('獲取的計畫數據缺少目的地信息:', planData);
            setError('計畫數據缺少目的地信息');
            return;
          }
          
          // 處理活動數據，檢查是否有 days 陣列
          let allActivities: ApiActivity[] = [];
          
          if (planData.days && Array.isArray(planData.days) && planData.days.length > 0) {
            console.log('發現 days 陣列，提取嵌套的活動');
            allActivities = extractActivitiesFromDays(planData.days);
            console.log('從 days 提取的活動:', allActivities);
          } else if (planData.activities && Array.isArray(planData.activities)) {
            console.log('直接使用頂層 activities 陣列');
            allActivities = planData.activities;
          }
          
          // 準備處理計畫數據，使用多種可能的字段名
          let extractedPlanId = '';
          if (typeof planData.id === 'string') extractedPlanId = planData.id;
          else if (typeof planData._id === 'string') extractedPlanId = planData._id;
          else extractedPlanId = `temp-${Date.now()}`;
          
          let planTitle = '';
          if (typeof planData.title === 'string') planTitle = planData.title;
          else if (typeof planData.name === 'string') planTitle = planData.name;
          else planTitle = "未命名旅行計畫";
          
          let planStartDate = '';
          if (typeof planData.start_date === 'string') planStartDate = planData.start_date;
          else if (typeof planData.startDate === 'string') planStartDate = planData.startDate;
          else planStartDate = new Date().toISOString().split('T')[0]; // 今天日期作為默認值
          
          let planEndDate = '';
          if (typeof planData.end_date === 'string') planEndDate = planData.end_date;
          else if (typeof planData.endDate === 'string') planEndDate = planData.endDate;
          else planEndDate = planStartDate; // 使用開始日期作為默認結束日期
          
          // 確保計畫數據有目的地
          const destination = typeof planData.destination === 'string' ? planData.destination : '未指定目的地';
          
          // 確保計畫數據符合預期格式
          const processedPlan: TravelPlan = {
            id: extractedPlanId,
            title: planTitle,
            destination: destination,
            start_date: planStartDate,
            end_date: planEndDate,
            description: planData.description,
            is_public: planData.is_public === undefined ? true : planData.is_public,
            user_id: planData.user_id || 'unknown',
            activities: allActivities,
            // 可選字段
            username: planData.username,
            cover_image: planData.cover_image,
            name: planData.name,
            startDate: planData.startDate,
            endDate: planData.endDate,
            created_at: planData.created_at,
            budget: planData.budget,
            travelers: planData.travelers,
            days: planData.days
          };
          
          // 將處理後的計畫數據設置到狀態
          setTravelPlan(processedPlan);
          
          // 更詳細的活動數據處理
          console.log('處理活動數據...');
          if (allActivities.length > 0) {
            console.log(`計畫包含 ${allActivities.length} 個活動`);
            const mappedActivities = convertToMapActivities(allActivities);
            console.log(`轉換後的地圖活動: ${mappedActivities.length} 個`);
            setMapActivities(mappedActivities);
          } else {
            console.log('計畫不包含活動或活動不是數組');
            setMapActivities([]);
          }
        } catch (mainError: any) {
          console.error('主要 API 請求失敗:', mainError);
          
          // 檢查是否為未授權錯誤
          if (mainError.message.includes('登入') || mainError.message.includes('認證') || mainError.message.includes('授權')) {
            setError(`此旅行計畫需要登入才能查看: ${mainError.message}`);
            toast.error('請登入後再查看此旅行計畫');
            return;
          }
          
          // 嘗試直接從伺服器獲取數據，繞過服務層
          try {
            console.log('嘗試直接從伺服器獲取數據');
            const API_BASE_URL = '/api';
            
            // 嘗試多個可能的 API 路徑
            const possibleUrls = [
              `${API_BASE_URL}/travel-plans/${planId}`,
              `${API_BASE_URL}/travel-plans/public/${planId}`,
              `${API_BASE_URL}/plans/public/${planId}`
            ];
            
            let responseData = null;
            let successUrl = '';
            
            // 嘗試每個可能的 URL
            for (const url of possibleUrls) {
              try {
                console.log(`直接請求 URL: ${url}`);
                
                const response = await fetch(url, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });
                
                console.log('直接請求響應狀態:', response.status, response.statusText);
                
                if (response.ok) {
                  // 先獲取文本內容，檢查是否為有效的 JSON
                  const textResponse = await response.text();
                  console.log(`響應內容的前 100 個字符:`, textResponse.substring(0, 100));
                  
                  try {
                    // 嘗試解析為 JSON
                    const data = JSON.parse(textResponse);
                    if (data && typeof data === 'object') {
                      responseData = data;
                      successUrl = url;
                      break;
                    }
                  } catch (parseError) {
                    console.error(`URL ${url} 返回的不是有效的 JSON:`, parseError);
                  }
                }
                
                // 如果是未授權錯誤，可能需要登入
                if (response.status === 401) {
                  console.log('請求返回 401 未授權，可能需要登入');
                }
              } catch (urlError) {
                console.error(`嘗試 URL ${url} 失敗:`, urlError);
              }
            }
            
            if (responseData) {
              console.log(`成功從 ${successUrl} 獲取數據:`, responseData);
              
              // 確保數據格式一致
              const processedResponseData: TravelPlan = {
                ...responseData,
                // 確保始終有活動陣列
                activities: Array.isArray(responseData.activities) ? responseData.activities : []
              };
              
              setTravelPlan(processedResponseData);
              
              console.log('直接請求處理活動數據...');
              if (processedResponseData.activities && Array.isArray(processedResponseData.activities)) {
                console.log(`直接請求結果包含 ${processedResponseData.activities.length} 個活動`);
                const mappedActivities = convertToMapActivities(processedResponseData.activities);
                console.log(`直接請求轉換後的地圖活動: ${mappedActivities.length} 個`);
                setMapActivities(mappedActivities);
              } else {
                console.log('直接請求結果不包含活動或活動不是數組');
                setMapActivities([]);
              }
              return;
            }
            
            throw new Error('嘗試所有可能的 API 路徑都失敗');
          } catch (directError) {
            console.error('直接請求也失敗:', directError);
            throw mainError; // 仍然拋出原始錯誤
          }
        }
      } catch (err: any) {
        console.error('加載旅行計畫時出錯:', err);
        
        // 提供更具體的錯誤信息
        let errorMessage = err.message || '加載旅行計畫時出錯';
        
        // 根據不同錯誤類型顯示不同提示
        if (errorMessage.includes('未找到認證令牌') || errorMessage.includes('需要登入') || errorMessage.includes('401')) {
          errorMessage = '此計畫需要登入才能查看，請先登入';
        } else if (errorMessage.includes('找不到') || errorMessage.includes('不存在')) {
          errorMessage = '找不到此旅行計畫，可能已被刪除或設為私人';
        } else if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
          errorMessage = '跨域請求失敗，可能是伺服器設定問題';
        } else if (errorMessage.includes('超時') || errorMessage.includes('timeout')) {
          errorMessage = '請求超時，請檢查網絡連接或稍後再試';
        } else if (err instanceof TypeError && errorMessage.includes('fetch')) {
          errorMessage = '網絡錯誤，無法連接到伺服器，請檢查網絡連接';
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTravelPlan();
  }, [planId]);

  if (loading) {
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

  if (error || !travelPlan) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-10">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <strong className="font-bold">出錯了！</strong>
            <span className="block sm:inline"> {error || '找不到旅行計畫'}</span>
          </div>
          
          <div className="flex flex-col gap-4 mt-6">
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded flex items-center w-fit"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              返回上一頁
            </button>
            
            <button
              onClick={() => navigate('/explore')}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center w-fit"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
              </svg>
              探索其他旅行計畫
            </button>
            
            {(error?.includes('登入') || error?.includes('401') || error?.includes('認證')) && (
              <button
                onClick={() => navigate('/login', { state: { redirectPath: window.location.pathname } })}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded flex items-center w-fit"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                </svg>
                前往登入
              </button>
            )}
            
            <button
              onClick={() => {
                // 嘗試重新加載頁面
                window.location.reload();
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded flex items-center w-fit"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              重新加載頁面
            </button>
            
            <button
              onClick={() => {
                // 測試不同的 API 路徑
                const currentPath = window.location.pathname;
                let newPath = '';
                
                if (currentPath.startsWith('/plans/view')) {
                  newPath = currentPath.replace('/plans/view', '/travel-plan');
                } else if (currentPath.startsWith('/travel-plan')) {
                  newPath = currentPath.replace('/travel-plan', '/plans/view');
                }
                
                if (newPath) {
                  navigate(newPath);
                } else {
                  toast.info('無法確定替代路徑');
                }
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded flex items-center w-fit"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg>
              嘗試替代路徑
            </button>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 text-blue-700 rounded">
            <h3 className="font-medium mb-2">您可以嘗試：</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>檢查網絡連接是否正常</li>
              <li>確認您訪問的計畫ID是否正確</li>
              <li>如果此計畫是私人計畫，請登入後再嘗試</li>
              <li>返回探索頁面查看其他可用的旅行計畫</li>
            </ul>
          </div>
          
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              調試信息
            </h3>
            <div className="bg-white p-3 rounded border border-gray-300 text-sm font-mono overflow-auto">
              <p><strong>計畫ID:</strong> {planId}</p>
              <p><strong>當前URL:</strong> {window.location.href}</p>
              <p><strong>API基礎URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}</p>
              <p><strong>錯誤消息:</strong> {error}</p>
              <p><strong>當前登入狀態:</strong> {localStorage.getItem('travo_auth_token') ? '已登入' : '未登入'}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 計算旅行的總天數
  const startDate = new Date(travelPlan.start_date);
  const endDate = new Date(travelPlan.end_date);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // 按日期分組顯示活動 - 添加更多防護措施
  const activitiesByDay: { [key: number]: ApiActivity[] } = {};
  for (let day = 1; day <= totalDays; day++) {
    // 確保 travelPlan.activities 是陣列
    const activities = Array.isArray(travelPlan.activities) ? travelPlan.activities : [];
    
    activitiesByDay[day] = activities
      .filter(activity => activity && activity.day === day) // 確保活動存在且具有正確的日期
      .sort((a, b) => {
        if (a.start_time && b.start_time) {
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        }
        return 0;
      });
  }

  // 格式化日期顯示
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">{travelPlan.title}</h1>
            <div className="mt-2 md:mt-0">
              <button
                onClick={() => navigate(-1)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
              >
                返回
              </button>
            </div>
          </div>
          
          <div className="text-gray-600 mb-4">
            <p className="inline-block bg-blue-100 text-blue-800 rounded px-2 py-1 mr-2">
              {travelPlan.destination}
            </p>
            <p className="inline-block text-sm">
              {formatDate(startDate)} — {formatDate(endDate)} ({totalDays} 天)
            </p>
          </div>
          
          {travelPlan.description && (
            <p className="text-gray-700 mt-2">{travelPlan.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* 左側: 行程列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-5">
              <h2 className="text-xl font-semibold mb-4">行程安排</h2>
              
              {Object.keys(activitiesByDay).map((dayString) => {
                const day = parseInt(dayString);
                const dayActivities = activitiesByDay[day];
                if (dayActivities.length === 0) return null;
                
                // 計算當天日期
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + day - 1);
                
                return (
                  <div key={`day-${day}`} className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">
                      第 {day} 天 - {formatDate(currentDate)}
                    </h3>
                    
                    <div className="space-y-3">
                      {dayActivities.map((activity, index) => (
                        <div 
                          key={activity.id || `activity-${day}-${index}`} 
                          className="bg-gray-50 p-3 rounded border-l-4 border-blue-500"
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium text-gray-800">
                              {'title' in activity ? activity.title : 
                               'name' in activity ? activity.name : `未命名活動 ${index}`}
                            </h4>
                            {activity.type && (
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                {activity.type}
                              </span>
                            )}
                          </div>
                          
                          {activity.start_time && (
                            <p className="text-sm text-gray-600 mt-1">
                              {new Date(activity.start_time).toLocaleTimeString('zh-TW', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {activity.end_time && ` - ${new Date(activity.end_time).toLocaleTimeString('zh-TW', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}`}
                            </p>
                          )}
                          
                          {activity.location && (
                            <p className="text-sm text-gray-600 mt-1">{activity.location}</p>
                          )}
                          
                          {activity.description && (
                            <p className="text-sm text-gray-700 mt-2">{activity.description}</p>
                          )}
                          
                          {/* 顯示活動照片 */}
                          {'photos' in activity && activity.photos && activity.photos.length > 0 && (
                            <div className="mt-3">
                              <div className="grid grid-cols-2 gap-2">
                                {activity.photos.slice(0, 2).map((photo, photoIndex) => (
                                  <div key={`photo-${photoIndex}`} className="relative h-20 overflow-hidden rounded">
                                    <img 
                                      src={photo} 
                                      alt={`活動照片 ${photoIndex + 1}`}
                                      className="object-cover w-full h-full"
                                      onError={(e) => {
                                        // 如果照片加載失敗，顯示替代文本
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null; // 防止無限循環
                                        target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22288%22%20height%3D%22225%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20288%20225%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_18e5eb07c96%20text%20%7B%20fill%3A%23eceeef%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A14pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_18e5eb07c96%22%3E%3Crect%20width%3D%22288%22%20height%3D%22225%22%20fill%3D%22%2355595c%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2296.828125%22%20y%3D%22118.8%22%3EThumbnail%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';
                                        console.warn(`無法加載照片: ${photo}`);
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                              {activity.photos.length > 2 && (
                                <p className="text-xs text-gray-500 mt-1">+{activity.photos.length - 2} 張更多照片</p>
                              )}
                            </div>
                          )}
                          
                          {/* 顯示評分 */}
                          {'rating' in activity && activity.rating && (
                            <div className="flex items-center mt-2">
                              <span className="text-yellow-500 mr-1">★</span>
                              <span className="text-sm text-gray-700">{activity.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {Object.keys(activitiesByDay).length === 0 && (
                <p className="text-gray-600">此旅行計畫還沒有安排活動。</p>
              )}
            </div>
          </div>

          {/* 右側: 地圖 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-5 h-[600px]">
              <h2 className="text-xl font-semibold mb-4">地圖</h2>
              <div className="h-[calc(100%-2rem)]">
                <PlanMap 
                  activities={mapActivities}
                  destination={travelPlan.destination}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="bottom-right" />
    </>
  );
};

export default ViewTravelPlanPage; 