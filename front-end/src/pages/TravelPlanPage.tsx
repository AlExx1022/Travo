import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import DaySection from '../components/travel-plan/DaySection';
import ActivityCard from '../components/travel-plan/ActivityCard';
import TimelineConnector from '../components/travel-plan/TimelineConnector';
import ImageCarousel from '../components/travel-plan/ImageCarousel';
import RatingDisplay from '../components/travel-plan/RatingDisplay';
import ActivityForm from '../components/travel-plan/ActivityForm';
import { useAuth } from '../contexts/AuthContext';
import travelPlanService from '../services/travelPlanService';
import toast from 'react-hot-toast';
import PlanMap from '../components/travel-plan/PlanMap';

// API URL設置 - 從環境變數中獲取
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// 定義旅行計劃介面
interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: string;
  travelers: number;
  days: Day[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 定義單天介面
interface Day {
  date: string;
  activities: Activity[];
}

// 定義活動介面
interface Activity {
  id: string;
  name: string;
  location: string;
  type: string;
  time: string;
  duration_minutes: number;
  lat: number;
  lng: number;
  place_id: string;
  address: string;
  rating?: number;
  photos: string[];
  description: string;
}

// 定義本地刪除紀錄
interface LocalDeletionRecord {
  planId: string;
  deletedActivityIds: string[];
  timestamp: number;
}

// 定義API結果類型
interface ApiResult {
  success: boolean;
  message: string;
  error?: any;
  data?: any;
  db_verification?: boolean;  // 資料庫驗證結果
  localOnly?: boolean;        // 是否僅本地操作
  serverError?: boolean;      // 是否伺服器錯誤
}

const TravelPlanPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [showShareNotification, setShowShareNotification] = useState<boolean>(false);
  const [locallyDeletedActivities, setLocallyDeletedActivities] = useState<string[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');
  // 新增活動相關狀態
  const [isAddingActivity, setIsAddingActivity] = useState<boolean>(false);
  const [activityDayIndex, setActivityDayIndex] = useState<number>(0);
  // 隱私設置相關狀態
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState<boolean>(false);
  
  // 本地刪除記錄的 localStorage 鍵名
  const getLocalStorageKey = (pid: string) => `travo_deleted_activities_${pid}`;
  
  // 從 localStorage 讀取本地刪除記錄
  const loadLocalDeletions = (pid: string): string[] => {
    if (!pid) return [];
    
    try {
      // 讀取特定計劃的刪除記錄
      const planSpecificKey = getLocalStorageKey(pid);
      const planSpecificData = localStorage.getItem(planSpecificKey);
      let planSpecificIds: string[] = [];
      
      if (planSpecificData) {
        try {
          const parsedData: LocalDeletionRecord = JSON.parse(planSpecificData);
          // 檢查記錄是否超過 24 小時 (86400000 毫秒)
          if (Date.now() - parsedData.timestamp > 86400000) {
            console.log('特定計劃的本地刪除記錄已過期，清除記錄');
            localStorage.removeItem(planSpecificKey);
          } else {
            planSpecificIds = parsedData.deletedActivityIds;
            console.log(`讀取到特定計劃 ${pid} 的本地刪除記錄:`, planSpecificIds);
          }
        } catch (parseError) {
          console.error('解析特定計劃的本地刪除記錄時出錯:', parseError);
        }
      }
      
      // 讀取全局刪除記錄
      const globalKey = 'travo_deleted_activities';
      const globalData = localStorage.getItem(globalKey);
      let globalIds: string[] = [];
      
      if (globalData) {
        try {
          const parsedData = JSON.parse(globalData);
          if (Array.isArray(parsedData)) {
            globalIds = parsedData;
            console.log('讀取到全局本地刪除記錄:', globalIds);
          }
        } catch (parseError) {
          console.error('解析全局本地刪除記錄時出錯:', parseError);
        }
      }
      
      // 合併兩個列表，確保沒有重複
      const combinedIds = [...new Set([...planSpecificIds, ...globalIds])];
      console.log(`為計劃 ${pid} 加載了 ${combinedIds.length} 個本地刪除記錄`);
      
      return combinedIds;
    } catch (error) {
      console.error('讀取本地刪除記錄時出錯:', error);
      return [];
    }
  };
  
  // 將刪除的活動ID保存到 localStorage
  const saveLocalDeletion = (pid: string, activityId: string) => {
    if (!pid || !activityId) return;
    
    try {
      const key = getLocalStorageKey(pid);
      const currentIds = loadLocalDeletions(pid);
      
      // 如果ID已經存在，不重複添加
      if (currentIds.includes(activityId)) return;
      
      // 添加新ID並保存
      const updatedIds = [...currentIds, activityId];
      const record: LocalDeletionRecord = {
        planId: pid,
        deletedActivityIds: updatedIds,
        timestamp: Date.now()
      };
      
      localStorage.setItem(key, JSON.stringify(record));
      console.log(`已將活動 ${activityId} 添加到本地刪除記錄`);
      
      // 更新狀態
      setLocallyDeletedActivities(updatedIds);
    } catch (error) {
      console.error('保存本地刪除記錄時出錯:', error);
    }
  };
  
  // 應用本地刪除到旅行計劃
  const applyLocalDeletions = (plan: TravelPlan, deletedIds: string[]): TravelPlan => {
    if (!plan || !deletedIds.length) return plan;
    
    console.log('應用本地刪除記錄到旅行計劃:', deletedIds);
    
    // 創建一個新的旅行計劃副本，過濾掉已刪除的活動
    const updatedPlan = {
      ...plan,
      days: plan.days.map(day => ({
        ...day,
        activities: day.activities.filter(activity => !deletedIds.includes(activity.id))
      }))
    };
    
    return updatedPlan;
  };
  
  // 從API獲取旅行計劃數據
  const loadTravelPlan = async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      console.error('嘗試加載旅行計劃時提供了無效的計劃ID:', id);
      setError('未提供有效的旅行計劃ID');
      setLoading(false);
      return;
    }
    
    try {
      console.log(`正在獲取旅行計劃數據，Plan ID: ${id}`);
      
      // 首先加載本地刪除記錄
      const deletedIds = loadLocalDeletions(id);
      setLocallyDeletedActivities(deletedIds);
      console.log(`為計劃 ${id} 加載了 ${deletedIds.length} 個本地刪除記錄`);
      
      // 使用服務獲取旅行計劃詳情
      const data = await travelPlanService.getTravelPlanById(id);
      console.log('獲取到的旅行計劃數據:', data);
      
      // 設定隱私狀態
      if (data && data.is_public !== undefined) {
        setIsPublic(data.is_public);
      } else if (data && data.plan && data.plan.is_public !== undefined) {
        setIsPublic(data.plan.is_public);
      } else {
        // 默認為公開
        setIsPublic(true);
      }
      
      // 更嚴格地檢查API回傳的數據結構
      const planData = data.plan || data;
      console.log('提取的旅行計劃數據:', planData);
      
      // 確保計劃ID存在
      if (!planData.id && planId) {
        console.log('API返回的數據缺少ID，使用URL中的計劃ID:', planId);
        planData.id = planId;
      }
      
      // 檢查API回傳的數據是否有計劃名稱
      if (!planData.title && !planData.name) {
        console.warn('API返回的數據缺少標題:', planData);
      }
      
      // 檢查API回傳的數據結構
      if (!planData.days || !Array.isArray(planData.days)) {
        console.warn('API返回的數據缺少或格式不正確的行程安排:', planData);
        
        // 嘗試將API返回的數據轉換為需要的格式
        const formattedData = formatApiResponse(planData);
        
        // 應用本地刪除
        const filteredData = applyLocalDeletions(formattedData, deletedIds);
        setTravelPlan(filteredData);
      } else {
        // 應用本地刪除後使用API數據
        const filteredData = applyLocalDeletions(planData, deletedIds);
        setTravelPlan(filteredData);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('獲取旅行計劃時出錯:', err);
      
      // 顯示更具體的錯誤訊息
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError('無法連接到API服務器。請確保後端服務正在運行並可訪問。');
      } else {
        setError(err.message || '無法加載旅行計劃數據，請稍後再試');
      }
      
      // 告知使用者需要嘗試重新連接到後端API
      console.error('無法連接到後端API，請確認伺服器是否正常運行');
      setLoading(false);
    }
  };
  
  // 初始化並加載數據
  useEffect(() => {
    const fetchTravelPlan = async () => {
      if (isAuthenticated) {
        await loadTravelPlan(planId || '');
      } else {
        // 未登入用戶重定向到登入頁面
        navigate('/login', { state: { from: `/travel-plans/${planId}` } });
      }
    };
    
    fetchTravelPlan();
  }, [planId, isAuthenticated, navigate]);
  
  // 計算旅行總天數
  const calculateTripDuration = (): number => {
    if (!travelPlan) return 0;
    
    const startDate = new Date(travelPlan.start_date);
    const endDate = new Date(travelPlan.end_date);
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 包括起始日
  };
  
  // 格式化日期範圍
  const formatDateRange = (): string => {
    if (!travelPlan) return '';
    
    return `${new Date(travelPlan.start_date).toLocaleDateString('zh-TW')} - ${new Date(travelPlan.end_date).toLocaleDateString('zh-TW')}`;
  };
  
  // 格式化API回應（處理不同的數據結構）
  const formatApiResponse = (apiData: any): TravelPlan => {
    console.log('格式化API數據:', apiData);
    
    // 若 apiData 本身是包裹在 plan 屬性中，提取出來
    const data = apiData.plan || apiData;
    
    // 檢查是否有必要的識別欄位 - plan_id 或 _id
    if (data.plan_id && !data.id) {
      console.log('檢測到 plan_id，將其映射為 id:', data.plan_id);
      data.id = data.plan_id;
    } else if (data._id && !data.id) {
      console.log('檢測到 _id，將其映射為 id:', data._id);
      data.id = data._id;
    }
    
    // 檢查預算和人數
    if (data.budget) {
      console.log('檢測到預算:', data.budget);
    } else {
      console.log('未檢測到預算，將設為預設值 "0"');
    }
    
    if (data.travelers) {
      console.log('檢測到人數:', data.travelers);
    } else {
      console.log('未檢測到人數，將設為預設值 1');
    }
    
    // 檢查是否已經符合需要的格式
    if (data.days && Array.isArray(data.days)) {
      console.log('數據已包含有效的 days 陣列');
      
      // 確保 id, budget, travelers 欄位存在
      const processedData = {
        ...data,
        id: data.id || data.plan_id || data._id || apiData.id || planId || 'unknown-id',
        budget: data.budget?.toString() || '0',
        travelers: data.travelers || data.traveler_count || 1
      };
      
      console.log('處理後的旅行計劃數據:', {
        id: processedData.id,
        budget: processedData.budget,
        travelers: processedData.travelers
      });
      
      return processedData as TravelPlan;
    }
    
    // 嘗試從API數據構建需要的結構
    const formatted: TravelPlan = {
      id: data.id || data._id || data.plan_id || apiData.id || planId || 'unknown-id',
      title: data.title || data.name || data.plan_name || `旅行計劃 (${new Date().toLocaleDateString('zh-TW')})`,
      destination: data.destination || data.location || '',
      start_date: data.start_date || data.startDate || new Date().toISOString().split('T')[0],
      end_date: data.end_date || data.endDate || new Date().toISOString().split('T')[0],
      budget: data.budget?.toString() || '0',
      travelers: data.travelers || data.traveler_count || 1,
      days: [],
      created_by: data.created_by || data.user_id || 'unknown',
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString()
    };
    
    console.log('基本格式化後的數據:', {
      id: formatted.id,
      budget: formatted.budget,
      travelers: formatted.travelers
    });
    
    // 嘗試不同的方式構建 days 數據
    
    // 方式1: 嘗試構建天數數據 - 從 itinerary 屬性
    if (data.itinerary && Array.isArray(data.itinerary)) {
      console.log('從 itinerary 構建天數數據');
      // 假設itinerary是按天分組的數組
      formatted.days = data.itinerary.map((day: any, index: number) => {
        const dayDate = new Date(formatted.start_date);
        dayDate.setDate(dayDate.getDate() + index);
        
        return {
          date: dayDate.toISOString().split('T')[0],
          activities: Array.isArray(day.activities) ? day.activities.map((act: any) => ({
            id: act.id || `temp-act-${Math.random().toString(36).substr(2, 9)}`,
            name: act.name || act.title || '活動',
            location: act.location || '',
            type: act.type || '景點',
            time: act.time || '09:00',
            duration_minutes: act.duration_minutes || act.duration || 60,
            lat: act.lat || act.latitude || 0,
            lng: act.lng || act.longitude || 0,
            place_id: act.place_id || '',
            address: act.address || '',
            rating: act.rating || undefined,
            photos: Array.isArray(act.photos) ? act.photos : 
                    act.photo ? [act.photo] : 
                    act.image ? [act.image] : [],
            description: act.description || ''
          })) : []
        };
      });
    } 
    // 方式2: 嘗試構建天數數據 - 從 activities 屬性
    else if (data.activities && Array.isArray(data.activities)) {
      console.log('從 activities 構建天數數據');
      // 如果API直接返回活動列表，嘗試按日期分組
      const activitiesByDate: Record<string, Activity[]> = {};
      
      data.activities.forEach((act: any) => {
        const activityDate = act.date || formatted.start_date;
        if (!activitiesByDate[activityDate]) {
          activitiesByDate[activityDate] = [];
        }
        
        activitiesByDate[activityDate].push({
          id: act.id || `temp-act-${Math.random().toString(36).substr(2, 9)}`,
          name: act.name || act.title || '未命名活動',
          location: act.location || '',
          type: act.type || '景點',
          time: act.time || '09:00',
          duration_minutes: act.duration_minutes || act.duration || 60,
          lat: act.lat || act.latitude || 0,
          lng: act.lng || act.longitude || 0,
          place_id: act.place_id || '',
          address: act.address || '',
          rating: act.rating || undefined,
          photos: Array.isArray(act.photos) ? act.photos : 
                  act.photo ? [act.photo] : 
                  act.image ? [act.image] : [],
          description: act.description || ''
        });
      });
      
      // 將分組後的活動轉換為days數組
      formatted.days = Object.keys(activitiesByDate).sort().map(date => ({
        date,
        activities: activitiesByDate[date]
      }));
    }
    // 方式3: 嘗試從 itinerary_days 構建
    else if (data.itinerary_days && Array.isArray(data.itinerary_days)) {
      console.log('從 itinerary_days 構建天數數據');
      formatted.days = data.itinerary_days.map((day: any, index: number) => {
        const dayDate = new Date(formatted.start_date);
        dayDate.setDate(dayDate.getDate() + index);
        
        return {
          date: day.date || dayDate.toISOString().split('T')[0],
          activities: Array.isArray(day.activities) ? day.activities.map((act: any) => ({
            id: act.id || `temp-act-${Math.random().toString(36).substr(2, 9)}`,
            name: act.name || act.title || '活動',
            location: act.location || '',
            type: act.type || '景點',
            time: act.time || '09:00',
            duration_minutes: act.duration_minutes || act.duration || 60,
            lat: act.lat || act.latitude || 0,
            lng: act.lng || act.longitude || 0,
            place_id: act.place_id || '',
            address: act.address || '',
            rating: act.rating || undefined,
            photos: Array.isArray(act.photos) ? act.photos : 
                    act.photo ? [act.photo] : 
                    act.image ? [act.image] : [],
            description: act.description || ''
          })) : []
        };
      });
    }
    // 創建一個示例行程（如果沒有任何行程數據）
    else {
      console.log('創建默認示例行程');
      // 如果找不到任何天數相關的數據，創建一個示例行程
      const startDate = new Date(formatted.start_date);
      const endDate = new Date(formatted.end_date);
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 包括起始日
      
      formatted.days = Array.from({ length: diffDays }).map((_, index) => {
        const dayDate = new Date(formatted.start_date);
        dayDate.setDate(dayDate.getDate() + index);
        
        return {
          date: dayDate.toISOString().split('T')[0],
          activities: [
            {
              id: `temp-act-example-${index + 1}`,
              name: `第 ${index + 1} 天示例活動`,
              location: formatted.destination || '未知位置',
              type: '景點',
              time: '09:00',
              duration_minutes: 120,
              lat: 0,
              lng: 0,
              place_id: '',
              address: '',
              rating: undefined,
              photos: [],
              description: '這是一個示例活動。請在旅行計劃詳情中添加更多活動。'
            }
          ]
        };
      });
    }
    
    console.log('格式化後的旅行計劃數據:', formatted);
    return formatted;
  };
  
  // 處理刪除旅行計劃
  const handleDeletePlan = async () => {
    if (!planId) return;
    
    try {
      setIsDeleting(true);
      await travelPlanService.deleteTravelPlan(planId);
      navigate('/my-travel-plans');
    } catch (error: any) {
      console.error('刪除旅行計劃時出錯:', error);
      setError(error.message || '刪除旅行計劃時出錯，請稍後再試');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };
  
  /**
   * 處理刪除活動
   * @param dayIndex 天數索引
   * @param activityId 要刪除的活動ID
   */
  const handleDeleteActivity = async (dayIndex: number, activityId: string) => {
    console.log(`[handleDeleteActivity] 開始嘗試刪除活動 ID: ${activityId}`);
    
    // 確保我們有有效的旅行計劃和活動ID
    if (!travelPlan || !activityId) {
      console.error('[handleDeleteActivity] 無效的旅行計劃或活動ID', { travelPlan, activityId });
      toast.error('無法刪除活動：缺少必要資訊');
      return;
    }

    // 確保我們有有效的計劃ID
    let validPlanId = planId || travelPlan.id;
    
    // 從 URL 中嘗試獲取計劃ID
    if (!validPlanId || validPlanId === 'undefined' || validPlanId === 'null') {
      const url = window.location.pathname;
      const planIdMatch = url.match(/\/travel-plans\/([a-zA-Z0-9]+)/);
      validPlanId = planIdMatch ? planIdMatch[1] : '';
      console.log(`[handleDeleteActivity] 從URL解析計劃ID: ${validPlanId}`);
    }
    
    // 記錄當前計劃ID
    if (validPlanId && validPlanId !== 'undefined') {
      localStorage.setItem('travo_last_plan_id', validPlanId);
      console.log(`[handleDeleteActivity] 保存當前計劃ID到本地存儲: ${validPlanId}`);
    }

    console.log(`[handleDeleteActivity] 使用計劃ID: ${validPlanId}`);

    // 確認用戶確實想刪除活動
    if (!window.confirm('確定要刪除此活動嗎？此操作無法撤銷。')) {
      console.log('[handleDeleteActivity] 用戶取消了刪除操作');
      return;
    }

    // 儲存原始旅行計劃數據，以便在錯誤時恢復
    const originalTravelPlan = { ...travelPlan };
    
    // 顯示刪除中狀態
    const deletingToast = toast.loading('正在刪除活動...');
    
    try {
      // 使用提供的 dayIndex 或查找活動所在的日期
      let actualDayIndex = dayIndex;
      let activityIndex = -1;
      
      // 如果提供的 dayIndex 小於 0，則搜索整個旅行計劃
      if (dayIndex < 0) {
        let activityFound = false;
        
        // 搜索活動
        travelPlan.days.forEach((day, dIdx) => {
          const foundActivityIndex = day.activities.findIndex(activity => activity.id === activityId);
          if (foundActivityIndex !== -1) {
            activityFound = true;
            actualDayIndex = dIdx;
            activityIndex = foundActivityIndex;
          }
        });
        
        if (!activityFound) {
          console.warn(`[handleDeleteActivity] 在當前旅行計劃中找不到 ID 為 ${activityId} 的活動，可能已被刪除`);
          toast.dismiss(deletingToast);
          toast.error('此活動可能已被刪除或不存在');
          return;
        }
      } else {
        // 在指定日期中查找活動
        activityIndex = travelPlan.days[actualDayIndex].activities.findIndex(activity => activity.id === activityId);
        if (activityIndex === -1) {
          console.warn(`[handleDeleteActivity] 在第 ${actualDayIndex + 1} 天中找不到 ID 為 ${activityId} 的活動`);
          toast.dismiss(deletingToast);
          toast.error('此活動可能已被刪除或不存在於指定日期');
          return;
        }
      }
      
      console.log(`[handleDeleteActivity] 找到了活動，位於第 ${actualDayIndex} 天，索引 ${activityIndex}`);
      
      // 調用API刪除活動，確保使用有效的計劃ID
      console.log(`[handleDeleteActivity] 開始調用API刪除活動 ID: ${activityId}，計劃ID: ${validPlanId}`);
      const result = await travelPlanService.deleteActivity(validPlanId, activityId);
      console.log('[handleDeleteActivity] API刪除結果:', result);
      
      toast.dismiss(deletingToast);
      
      if (result.success) {
        console.log('[handleDeleteActivity] 活動刪除成功');
        
        // 檢查是否是本地刪除模式
        if (result.localOnly) {
          console.log('[handleDeleteActivity] 活動僅在本地刪除:', result.message);
          toast.success('活動已在本地刪除，刷新頁面後仍然有效', { duration: 3000 });
        }
        
        // 數據庫驗證結果，如果存在
        const dbVerified = result.db_verification;
        if (dbVerified === false) {
          console.warn('[handleDeleteActivity] 數據庫驗證失敗，活動可能未在數據庫中刪除');
          try {
            // 嘗試強制重新載入計劃以確保一致性
            console.log('[handleDeleteActivity] 嘗試強制刷新計劃...');
            toast.loading('正在同步資料庫變更...');
            const refreshedPlan = await travelPlanService.forceRefreshTravelPlan(validPlanId);
            
            if (refreshedPlan) {
              console.log('[handleDeleteActivity] 計劃已強制刷新，更新前端狀態');
              setTravelPlan(refreshedPlan);
              toast.success('活動已刪除並同步到資料庫', { duration: 2000 });
              return;
            }
          } catch (refreshError) {
            console.error('[handleDeleteActivity] 強制刷新失敗:', refreshError);
            // 繼續使用本地刪除方式
          }
        }
        
        // 更新本地狀態，提供即時反饋
        setTravelPlan(prevPlan => {
          if (!prevPlan) return prevPlan;
          
          const updatedDays = [...prevPlan.days];
          if (actualDayIndex >= 0 && actualDayIndex < updatedDays.length) {
            updatedDays[actualDayIndex] = {
              ...updatedDays[actualDayIndex],
              activities: updatedDays[actualDayIndex].activities.filter(activity => activity.id !== activityId)
            };
          }
          
          return {
            ...prevPlan,
            days: updatedDays
          };
        });
        
        // 將活動ID保存到本地存儲以確保刷新後仍然保持刪除狀態
        if (result.localOnly || dbVerified !== true) {
          saveLocalDeletion(validPlanId || 'unknown', activityId);
          console.log(`[handleDeleteActivity] 已將活動 ${activityId} 添加到本地刪除記錄`);
        }
        
        if (!result.localOnly) {
          toast.success('活動已成功刪除', { duration: 2000 });
        }
        return;
      } else {
        // 處理不同類型的錯誤
        if (result.clientError) {
          // 客戶端錯誤，例如權限不足或無效的輸入
          console.warn(`[handleDeleteActivity] 客戶端錯誤: ${result.message}`);
          
          // 特別處理權限錯誤
          if (result.error && result.error.includes('permission_denied')) {
            toast.error('您沒有權限刪除此活動。請確認您是此旅行計劃的擁有者或重新登入。', { duration: 5000 });
            
            // 提供重新登入按鈕
            toast((t) => (
              <div>
                <p>權限問題可能是由於登入狀態過期，請重新登入：</p>
                <button 
                  className="mt-2 bg-blue-500 text-white p-2 rounded" 
                  onClick={() => {
                    toast.dismiss(t.id);
                    // 清除登入狀態並跳轉到登入頁面
                    localStorage.removeItem('token');
                    navigate('/login', { state: { from: `/travel-plans/${validPlanId}` } });
                  }}
                >
                  重新登入
                </button>
              </div>
            ), { duration: 10000 });
            
            return;
          }
          
          toast.error(result.message || '無法刪除活動，請確認您有權限執行此操作');
          
          // 嘗試重新加載旅行計劃以獲取最新數據
          if (validPlanId) {
            loadTravelPlan(validPlanId);
          }
          return;
        } else if (result.serverError) {
          // 服務器錯誤，如網絡問題或內部服務器錯誤
          console.error(`[handleDeleteActivity] 服務器錯誤: ${result.message}`);
          toast.error('服務器處理請求時出錯，請稍後再試');
          
          // 仍然在本地進行刪除標記
          saveLocalDeletion(validPlanId || 'unknown', activityId);
          setLocallyDeletedActivities(prev => [...prev, activityId]);
          
          // 更新本地界面
          setTravelPlan(prevPlan => {
            if (!prevPlan) return prevPlan;
            const updatedDays = [...prevPlan.days];
            updatedDays[actualDayIndex] = {
              ...updatedDays[actualDayIndex],
              activities: updatedDays[actualDayIndex].activities.filter(activity => activity.id !== activityId)
            };
            return { ...prevPlan, days: updatedDays };
          });
          
          toast((t) => (
            <div>
              <p>活動已在界面上刪除，但未能保存到服務器。</p>
              <p>刷新後活動仍保持刪除狀態。</p>
            </div>
          ), { duration: 5000 });
          
          return;
        } else {
          // 未分類的錯誤
          throw new Error(result.message || '刪除活動失敗，請再試一次');
        }
      }
    } catch (error: any) {
      // 恢復原始旅行計劃數據
      console.error('[handleDeleteActivity] 刪除活動時發生錯誤:', error);
      setTravelPlan(originalTravelPlan);
      
      // 向用戶顯示錯誤訊息
      toast.dismiss(deletingToast);
      toast.error(`刪除活動失敗: ${error.message || '未知錯誤'}`);
      
      // 在錯誤後，刷新數據以確保數據一致性
      console.log('[handleDeleteActivity] 嘗試重新加載旅行計劃數據...');
      if (validPlanId) {
        loadTravelPlan(validPlanId);
      }
    }
  };
  
  // 處理分享旅行計劃
  const handleSharePlan = () => {
    const url = `${window.location.origin}/travel-plans/${planId}`;
    setShareUrl(url);
    
    // 嘗試使用原生瀏覽器分享API
    if (navigator.share) {
      navigator.share({
        title: travelPlan?.title || '旅行計劃',
        text: `查看我的旅行計劃: ${travelPlan?.title}`,
        url: url
      }).catch(err => console.error('分享失敗:', err));
    } else {
      // 複製到剪貼板
      navigator.clipboard.writeText(url).then(() => {
        setShowShareNotification(true);
        setTimeout(() => setShowShareNotification(false), 3000);
      }).catch(err => {
        console.error('複製到剪貼板失敗:', err);
      });
    }
  };
  
  // 啟動標題編輯
  const handleTitleEdit = () => {
    setEditedTitle(travelPlan?.title || '');
    setIsEditingTitle(true);
  };
  
  // 保存編輯的標題
  const handleTitleSave = async () => {
    if (!travelPlan || !planId || editedTitle === travelPlan.title) {
      setIsEditingTitle(false);
      return;
    }

    if (!editedTitle.trim()) {
      toast.error('標題不能為空');
      return;
    }

    const saveToast = toast.loading('儲存中...');
    
    try {
      // 創建更新的計劃數據，只包含需要更新的欄位
      const updateData = {
        title: editedTitle.trim()
      };

      // 調用更新API
      await travelPlanService.updateTravelPlan(planId, updateData);
      
      // 更新本地狀態
      setTravelPlan({
        ...travelPlan,
        title: editedTitle.trim()
      });
      
      toast.success('標題已更新', { id: saveToast });
    } catch (error) {
      console.error('更新標題時出錯:', error);
      toast.error(`儲存失敗: ${error instanceof Error ? error.message : '未知錯誤'}`, { id: saveToast });
    } finally {
      setIsEditingTitle(false);
    }
  };
  
  // 處理開始新增活動
  const handleStartAddActivity = (dayIndex: number) => {
    setActivityDayIndex(dayIndex);
    setIsAddingActivity(true);
  };
  
  // 處理取消新增活動
  const handleCancelAddActivity = () => {
    setIsAddingActivity(false);
  };
  
  // 處理新增活動成功
  const handleActivityAddSuccess = () => {
    setIsAddingActivity(false);
    
    // 重新載入旅行計劃以獲取最新數據
    if (planId) {
      toast.success('正在重新載入旅行計劃...');
      loadTravelPlan(planId);
    }
  };
  
  // 獲取所有活動
  const getAllActivities = (): Activity[] => {
    if (!travelPlan || !travelPlan.days) return [];
    
    let allActivities: Activity[] = [];
    travelPlan.days.forEach(day => {
      if (day.activities && Array.isArray(day.activities)) {
        // 過濾掉已在本地刪除的活動
        const filteredActivities = day.activities.filter(
          activity => activity.id && !locallyDeletedActivities.includes(activity.id)
        );
        allActivities = [...allActivities, ...filteredActivities];
      }
    });
    
    return allActivities;
  };
  
  // 處理隱私設置切換
  const handlePrivacyToggle = async () => {
    if (!planId || !travelPlan) return;
    
    setIsUpdatingPrivacy(true);
    const updatingToast = toast.loading(`${isPublic ? '設為私密' : '設為公開'}中...`);
    
    try {
      // 調用API更新隱私設置
      const result = await travelPlanService.updateTravelPlanPrivacy(planId, !isPublic);
      
      if (result.success) {
        // 更新本地狀態
        setIsPublic(!isPublic);
        toast.success(`已${!isPublic ? '公開' : '設為私密'}此旅行計劃`, { id: updatingToast });
      } else {
        throw new Error(result.message || '更新隱私設置失敗');
      }
    } catch (error: any) {
      console.error('更新隱私設置時出錯:', error);
      toast.error(`更新失敗: ${error.message || '未知錯誤'}`, { id: updatingToast });
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">正在加載旅行計劃...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !travelPlan) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex justify-center items-center h-[80vh]">
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-bold text-gray-800">無法加載旅行計劃</h2>
            <p className="mt-2 text-gray-600">{error || '發生錯誤，請稍後再試'}</p>
            <button 
              onClick={() => navigate('/build')}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              建立新旅行計劃
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* 分享通知 */}
      {showShareNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50">
          已複製旅行計劃連結到剪貼板
        </div>
      )}
      
      {/* 新增活動表單對話框 */}
      {isAddingActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <ActivityForm
                dayIndex={activityDayIndex}
                onSuccess={handleActivityAddSuccess}
                onCancel={handleCancelAddActivity}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* 刪除確認對話框 */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">確認刪除</h3>
            <p className="text-gray-600 mb-6">您確定要刪除此旅行計劃嗎？此操作無法撤銷。</p>
            <div className="flex justify-end space-x-3">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isDeleting}
              >
                取消
              </button>
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                onClick={handleDeletePlan}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    刪除中...
                  </>
                ) : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          {/* 左側區域 - 旅行計劃內容 - 減小寬度比例 */}
          <div className="lg:col-span-3">
            {/* 旅行計劃標題區域 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 relative">
              <div className="flex flex-wrap justify-between items-start mb-4">
                {isEditingTitle ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleTitleSave();
                    }}
                    className="flex flex-col gap-2"
                  >
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      autoFocus
                      className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent w-full"
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsEditingTitle(false);
                          setEditedTitle(travelPlan?.title || '');
                        }
                      }}
                    />
                    <div className="text-xs text-gray-500">按 Enter 儲存或 Esc 取消</div>
                  </form>
                ) : (
                  <h1 
                    className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 group"
                    onClick={handleTitleEdit}
                  >
                    {travelPlan?.title}
                    <span className="ml-2 invisible group-hover:visible text-sm text-blue-500">
                      <i className="fas fa-pencil-alt"></i>
                    </span>
                  </h1>
                )}
                <div className="flex space-x-2 mt-2 sm:mt-0"></div>
              </div>
              
              {/* 刪除按鈕 - 右上角紅色 X */}
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="absolute top-0 right-0 w-7 h-7 flex items-center justify-center rounded-tr-lg rounded-bl-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                title="刪除旅行計劃"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="flex flex-wrap items-center text-gray-600 gap-4">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{travelPlan.destination}</span>
                </div>
                
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formatDateRange()} ({calculateTripDuration()} 天)</span>
                </div>
                
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{travelPlan.travelers} 人</span>
                </div>
                
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>NT$ {parseInt(travelPlan.budget).toLocaleString()} 預算</span>
                </div>
              </div>
              
              {/* 分享按鈕 - 右下角 */}
              <div className="absolute bottom-2 right-2 flex space-x-2">
                {/* 隱私設置按鈕 */}
                <button
                  onClick={handlePrivacyToggle}
                  disabled={isUpdatingPrivacy}
                  className={`w-7 h-7 flex items-center justify-center rounded-full ${
                    isPublic 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700'
                  } transition-colors`}
                  title={isPublic ? '目前為公開，點擊設為私密' : '目前為私密，點擊設為公開'}
                >
                  {isUpdatingPrivacy ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : isPublic ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
                
                {/* 分享按鈕 */}
                <button
                  onClick={handleSharePlan}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 transition-colors"
                  title="分享旅行計劃"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 日程區域 */}
            <div>
              {travelPlan && travelPlan.days && Array.isArray(travelPlan.days) ? (
                <>
                  {travelPlan.days.map((day, index) => {
                    // 添加額外日誌以幫助調試
                    console.log(`渲染第 ${index + 1} 天:`, day);
                    
                    // 檢查每天的活動是否為有效數組
                    const validActivities = Array.isArray(day.activities) 
                      ? day.activities 
                      : [];
                    
                    // 計算前幾天的活動總數
                    let previousActivitiesCount = 0;
                    for (let i = 0; i < index; i++) {
                      const prevDayActivities = Array.isArray(travelPlan.days[i]?.activities)
                        ? travelPlan.days[i].activities
                        : [];
                      previousActivitiesCount += prevDayActivities.length;
                    }
                    
                    console.log(`第 ${index + 1} 天之前的活動總數: ${previousActivitiesCount}`);
                    
                    return (
                      <div key={index} className="mb-8">
                        <DaySection
                          day={index + 1}
                          date={day.date}
                          activities={validActivities}
                          onDeleteActivity={handleDeleteActivity}
                          onAddActivity={handleStartAddActivity}
                          previousActivitiesCount={previousActivitiesCount}
                        />
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="bg-red-50 rounded-lg p-4 text-red-700">
                  <p>無有效的行程數據</p>
                  <p className="text-sm mt-2">技術細節：{JSON.stringify(travelPlan?.days)}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* 右側區域 - 顯示地圖和行程摘要 - 增加寬度比例 */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-20">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex justify-between items-center">
                <span>旅行計劃地圖</span>
                <span className="text-xs text-gray-500 font-normal">若無顯示請重新刷新網頁</span>
              </h3>
              {travelPlan && (
                <div className="h-[750px] rounded-lg overflow-hidden border border-gray-200">
                  <PlanMap 
                    activities={getAllActivities().map((act, index) => ({
                      id: act.id || `temp-${index}`,
                      name: act.name,
                      lat: act.lat,
                      lng: act.lng,
                      order: index + 1,
                      type: act.type,
                      time: act.time
                    }))} 
                    destination={travelPlan.destination}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TravelPlanPage; 