import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import DatePicker, { registerLocale } from 'react-datepicker';
import { zhTW } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import travelPlanService from '../services/travelPlanService';

// 註冊中文語言環境
registerLocale('zh-TW', zhTW);

// 為 Google Maps API 擴展 Window 接口
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            inputField: HTMLInputElement,
            options?: {
              types?: string[];
              language?: string;
              fields?: string[];
            }
          ) => {
            addListener: (event: string, callback: () => void) => void;
            getPlace: () => {
              formatted_address?: string;
              name?: string;
              place_id?: string;
              geometry?: {
                location?: {
                  lat: () => number;
                  lng: () => number;
                }
              };
            };
          };
        };
      };
    };
    initAutocomplete: () => void; // 添加全局回調函數的類型定義
  }
}

// 定義旅行計劃的介面
interface TravelPlan {
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  interests: string[];
  travelers: number;
  preference: string;
  companions: string;
}

// 地點建議介面
interface PlaceSuggestion {
  place_id: string;
  description: string;
  main_text?: string;
  secondary_text?: string;
}

// 可選的興趣列表
const interestOptions = [
  { id: 'history', label: '歷史', icon: '🏛️' },
  { id: 'nature', label: '自然風景', icon: '🏞️' },
  { id: 'food', label: '美食', icon: '🍜' },
  { id: 'shopping', label: '購物', icon: '🛍️' },
  { id: 'culture', label: '文化體驗', icon: '🎎' },
  { id: 'relaxation', label: '放鬆療癒', icon: '🧘' },
  { id: 'photography', label: '攝影', icon: '📸' },
  { id: 'entertainment', label: '娛樂', icon: '🎡' }
];

// 旅行節奏選項
const preferenceOptions = [
  { id: 'relaxed', label: '輕鬆' },
  { id: 'balanced', label: '平衡' },
  { id: 'intensive', label: '緊湊' }
];

// 同行人選項
const companionOptions = [
  { id: 'solo', label: '個人' },
  { id: 'couple', label: '情侶' },
  { id: 'family', label: '家庭' },
  { id: 'friends', label: '朋友' },
  { id: 'business', label: '商務' }
];

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// 檢查是否已經載入 Google Maps API
const isGoogleMapsLoaded = () => {
  return window.google && window.google.maps;
};

// API URL設置 - 從環境變數中獲取
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const BuildPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // 旅行計劃表單數據
  const [plan, setPlan] = useState<TravelPlan>({
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    interests: [],
    travelers: 1,
    preference: 'balanced',
    companions: 'solo'
  });
  
  // 日期選擇器狀態
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  // 處理日期範圍變化
  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setDateRange(dates);
    
    setPlan(prev => ({
      ...prev,
      startDate: start ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}` : '',
      endDate: end ? `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}` : ''
    }));
  };

  // 處理輸入變化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setPlan({
      ...plan,
      [name]: value
    });
  };

  // 載入 Google Maps JavaScript API
  useEffect(() => {
    // 檢查 API 密鑰是否存在
    console.log('API Key 狀態:', GOOGLE_MAPS_API_KEY ? '已設置' : '未設置');
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('未找到 Google Maps API 密鑰。請確保在環境變數中設置了 VITE_GOOGLE_MAPS_API_KEY。');
      setMapError('未找到 Google Maps API 密鑰');
      return;
    }

    // 如果已經載入，則不需要再次載入
    if (isGoogleMapsLoaded()) {
      console.log('Google Maps API 已載入');
      setScriptLoaded(true);
      return;
    }

    // 直接提供地點建議的後備機制
    const setupManualSuggestions = () => {
      if (autocompleteInputRef.current) {
        console.log('設置手動建議模式');
        // 添加基本的輸入事件處理
        autocompleteInputRef.current.addEventListener('input', (e) => {
          // 可以在這裡添加自定義的地點建議邏輯
          console.log('輸入更新:', (e.target as HTMLInputElement).value);
        });
      }
    };

    try {
      console.log('正在嘗試載入 Google Maps API...');
      
      // 定義回調函數
      window.initAutocomplete = () => {
        console.log("Google Maps API 載入完成");
        setScriptLoaded(true);
      };

      // 定義錯誤處理函數
      const handleScriptError = (error: Event | string) => {
        console.error('Google Maps API 載入失敗:', error);
        setMapError('Google Maps API 載入失敗，請檢查網絡連接或 API 密鑰是否正確');
        setupManualSuggestions();
      };

      // 載入腳本
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=zh-TW&callback=initAutocomplete`;
      script.async = true;
      script.defer = true;
      script.onerror = handleScriptError;
      
      document.head.appendChild(script);
      
      // 設置超時檢測
      const timeoutId = setTimeout(() => {
        if (!isGoogleMapsLoaded()) {
          console.warn('Google Maps API 載入超時');
          handleScriptError('載入超時');
        }
      }, 10000); // 10秒超時
      
      return () => {
        // 清理腳本
        clearTimeout(timeoutId);
        const scriptElement = document.querySelector('#google-maps-script');
        if (scriptElement) {
          scriptElement.remove();
        }
        
        // 移除全局回調
        if (window.initAutocomplete) {
          // @ts-ignore
          window.initAutocomplete = undefined;
        }
      };
    } catch (error) {
      console.error('添加 Google Maps 腳本時出錯:', error);
      setMapError('載入 Google Maps 時出錯');
      setupManualSuggestions();
    }
  }, []);

  // 初始化 Google Places Autocomplete
  useEffect(() => {
    console.log('初始化 Places Autocomplete 狀態檢查:', 
      scriptLoaded ? '腳本已載入' : '腳本未載入', 
      autocompleteInputRef.current ? '輸入框已渲染' : '輸入框未渲染');
    
    if (!scriptLoaded || !autocompleteInputRef.current) return;
    
    try {
      console.log('初始化 Places Autocomplete...');
      const options = {
        types: ['(cities)'], // 僅城市
        language: 'zh-TW',   // 使用中文繁體
        fields: ['formatted_address', 'geometry', 'name', 'place_id'] // 指定需要的欄位
      };

      const autocomplete = new window.google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        options
      );

      // 確保輸入框不會被灰色禁用
      autocompleteInputRef.current.setAttribute('autocomplete', 'off');
      
      // 監聽選擇事件
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log("選擇的地點:", place);
        if (place.formatted_address) {
          setPlan({
            ...plan,
            destination: place.formatted_address
          });
        } else if (place.name) {
          setPlan({
            ...plan,
            destination: place.name
          });
        }
      });
      
      console.log('Places Autocomplete 初始化成功');
    } catch (error) {
      console.error('Google Places Autocomplete 初始化錯誤:', error);
      setMapError('初始化地點自動完成功能時出錯');
    }
  }, [scriptLoaded]);

  // 處理興趣選擇
  const handleInterestToggle = (interestId: string) => {
    const newInterests = [...plan.interests];
    if (newInterests.includes(interestId)) {
      // 移除已存在的興趣
      const index = newInterests.indexOf(interestId);
      newInterests.splice(index, 1);
    } else {
      // 添加新的興趣
      newInterests.push(interestId);
    }
    setPlan({
      ...plan,
      interests: newInterests
    });
  };

  // 處理旅客數量變化
  const handleTravelersChange = (value: number) => {
    if (value >= 1 && value <= 10) {
      setPlan({
        ...plan,
        travelers: value
      });
    }
  };

  // 前進到下一步
  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 返回上一步
  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // 驗證當前步驟
  const validateCurrentStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!plan.destination.trim()) {
        setError('請輸入旅行目的地');
        return false;
      }
      if (!plan.startDate) {
        setError('請選擇開始日期');
        return false;
      }
      if (!plan.endDate) {
        setError('請選擇結束日期');
        return false;
      }
      if (new Date(plan.startDate) > new Date(plan.endDate)) {
        setError('開始日期不能晚於結束日期');
        return false;
      }
    } else if (currentStep === 2) {
      if (!plan.budget) {
        setError('請輸入預算');
        return false;
      }
      if (plan.interests.length === 0) {
        setError('請至少選擇一個興趣');
        return false;
      }
    }
    return true;
  };

  // 提交旅行計劃
  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/build' } });
      return;
    }

    // 提交前再次驗證所有必要字段
    const validationErrors = [];
    if (!plan.destination.trim()) validationErrors.push('目的地不能為空');
    if (!plan.startDate) validationErrors.push('開始日期不能為空');
    if (!plan.endDate) validationErrors.push('結束日期不能為空');
    if (new Date(plan.startDate) > new Date(plan.endDate)) validationErrors.push('開始日期不能晚於結束日期');
    if (!plan.budget) validationErrors.push('預算不能為空');
    if (plan.interests.length === 0) validationErrors.push('請至少選擇一個興趣');
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setIsSubmitting(true);
    setError(''); // 清除之前的錯誤信息
    
    try {
      // 準備符合 API 格式的請求數據
      const requestData = {
        destination: plan.destination,
        start_date: plan.startDate,
        end_date: plan.endDate,
        budget: plan.budget,
        interests: plan.interests,
        preference: plan.preference,
        companions: plan.companions,
        travelers: plan.travelers
      };

      console.log('提交旅行計劃:', requestData);
      
      // 使用服務創建旅行計劃
      const response = await travelPlanService.createTravelPlan(requestData);
      
      console.log('旅行計劃生成成功:', response);
      
      // 獲取計劃ID，處理不同的後端API回應格式
      const planId = response.plan_id || response.id || (response.plan && response.plan.id);
      
      if (!planId) {
        console.error('無法從API響應中獲取計劃ID:', response);
        throw new Error('從API響應中獲取計劃ID失敗');
      }
      
      // 跳轉到生成的旅行計劃詳情頁
      navigate(`/travel-plans/${planId}`);
    } catch (error: any) {
      console.error('提交旅行計劃時出錯:', error);
      
      // 顯示更具體的錯誤信息
      let errorMessage = '提交旅行計劃時出錯，請稍後再試';
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = '無法連接到API服務器。請確保網絡連接正常且後端服務可訪問。';
      } else if (error.message) {
        // 使用API返回的具體錯誤訊息
        errorMessage = error.message;
      }
      
      // 處理不同類型的錯誤
      if (error.status === 401 || error.status === 403) {
        errorMessage = '認證失敗，請重新登入';
        navigate('/login', { state: { from: '/build' } });
      } else if (error.status === 429) {
        errorMessage = '請求過於頻繁，請稍後再試';
      } else if (error.status >= 500) {
        errorMessage = '服務器錯誤，請稍後再試';
      }
      
      setError(errorMessage);
      
      // 顯示一個友好的錯誤提示，滾動到錯誤信息位置
      setTimeout(() => {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 添加自定義樣式覆蓋
  useEffect(() => {
    // 添加自定義日期選擇器樣式
    const style = document.createElement('style');
    style.id = 'datepicker-custom-styles';
    style.innerHTML = `
      .react-datepicker {
        font-family: 'Noto Sans TC', sans-serif;
        border-radius: 0.5rem;
        border: none;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }
      .react-datepicker__header {
        background-color: #f3f4f6;
        border-bottom: 1px solid #e5e7eb;
        border-top-left-radius: 0.5rem;
        border-top-right-radius: 0.5rem;
        padding-top: 12px;
      }
      .react-datepicker__navigation {
        top: 12px;
      }
      .react-datepicker__day--selected, 
      .react-datepicker__day--in-range, 
      .react-datepicker__day--in-selecting-range {
        background-color: #3b82f6;
        color: white;
      }
      .react-datepicker__day--selected:hover, 
      .react-datepicker__day--in-range:hover {
        background-color: #2563eb;
      }
      .react-datepicker__day:hover {
        background-color: #e5e7eb;
      }
      .react-datepicker__triangle {
        display: none;
      }
      
      /* 添加動畫樣式 */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .animate-fade-in {
        animation: fadeIn 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // 清理樣式
      const styleElement = document.getElementById('datepicker-custom-styles');
      if (styleElement) styleElement.remove();
    };
  }, []);

  // 根據當前步驟渲染不同的表單部分
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-200">目的地和日期</h2>
            
            <div className="space-y-6">
              <div className="relative">
                <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">您想去哪裡旅行？</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    ref={autocompleteInputRef}
                    type="text"
                    id="destination"
                    name="destination"
                    value={plan.destination}
                    onChange={handleInputChange}
                    placeholder="輸入城市名稱..."
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 py-3"
                    autoComplete="off"
                  />
                </div>
                {!scriptLoaded && !mapError && (
                  <p className="mt-2 text-sm text-yellow-600 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    正在載入地點自動完成功能...
                  </p>
                )}
                {mapError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {mapError}。請直接輸入目的地名稱。
                  </p>
                )}
              </div>
              
              <div className="mt-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">旅行日期</label>
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="relative">
                      <DatePicker
                        selectsRange={true}
                        startDate={dateRange[0]}
                        endDate={dateRange[1]}
                        onChange={handleDateRangeChange}
                        minDate={new Date()}
                        locale="zh-TW"
                        dateFormat="yyyy/MM/dd"
                        placeholderText="選擇出發和返回日期"
                        className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 py-3"
                        monthsShown={2}
                        showPopperArrow={false}
                        customInput={
                          <input
                            type="text"
                            className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 py-4 text-base min-h-[3.5rem]"
                          />
                        }
                      />
                      {dateRange[0] && (
                        <button
                          type="button"
                          onClick={() => {
                            setDateRange([null, null]);
                            setPlan(prev => ({ ...prev, startDate: '', endDate: '' }));
                          }}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-red-600 transition-colors"
                          aria-label="清除日期選擇"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    請先選擇出發日期，再選擇返回日期
                  </div>
                </div>
                
                {plan.startDate && plan.endDate && (
                  <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg text-blue-800 text-sm shadow-sm border border-blue-100 transition-all duration-300 hover:shadow-md">
                    <div className="flex items-center mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-base text-blue-700">旅行摘要</span>
                    </div>
                    <div className="pl-9 space-y-3">
                      <div className="flex flex-col">
                        <span className="font-medium mb-1">出發日期：</span>
                        <div className="bg-white bg-opacity-60 px-3 py-2 rounded-md break-words">
                          {(() => {
                            // 直接解析日期字符串，完全避免時區問題
                            if (!plan.startDate) return '';
                            const [year, month, day] = plan.startDate.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
                          })()}
                          <div className="text-xs text-blue-600 mt-1">
                            {(() => {
                              if (!plan.startDate) return '';
                              const [year, month, day] = plan.startDate.split('-').map(Number);
                              const date = new Date(year, month - 1, day);
                              return date.toLocaleDateString('zh-TW', { weekday: 'long' });
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium mb-1">返回日期：</span>
                        <div className="bg-white bg-opacity-60 px-3 py-2 rounded-md break-words">
                          {(() => {
                            // 直接解析日期字符串，完全避免時區問題
                            if (!plan.endDate) return '';
                            const [year, month, day] = plan.endDate.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
                          })()}
                          <div className="text-xs text-blue-600 mt-1">
                            {(() => {
                              if (!plan.endDate) return '';
                              const [year, month, day] = plan.endDate.split('-').map(Number);
                              const date = new Date(year, month - 1, day);
                              return date.toLocaleDateString('zh-TW', { weekday: 'long' });
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center mt-2 pt-2 border-t border-blue-100">
                        <span className="font-medium w-28 mb-1 sm:mb-0">總天數：</span>
                        <span className="bg-blue-600 text-white px-3 py-0.5 rounded-full font-medium inline-block">{getTripDuration()} 天</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-200">預算和偏好</h2>
            
            <div className="space-y-8">
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">您的旅行預算是多少？</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">NT$</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    id="budget"
                    name="budget"
                    value={plan.budget}
                    onChange={(e) => {
                      // 只允許數字
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setPlan({
                        ...plan,
                        budget: value
                      });
                    }}
                    placeholder="20000"
                    className="pl-12 pr-12 block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 py-3"
                    autoComplete="off"
                    data-lpignore="true"
                    data-gmap-noinput="true"
                    aria-label="預算金額"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">每人</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">建議提供您可接受的人均預算，以便我們推薦合適的住宿和活動</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">您對哪些類型的旅行體驗感興趣？</label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {interestOptions.map((interest) => (
                    <div 
                      key={interest.id}
                      className={`
                        p-3 rounded-lg flex flex-col items-center justify-center cursor-pointer border text-center transition-all duration-200
                        ${plan.interests.includes(interest.id) 
                          ? 'bg-blue-100 border-blue-500 text-blue-800 shadow-md transform scale-105' 
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'}
                      `}
                      onClick={() => handleInterestToggle(interest.id)}
                    >
                      <span className="text-2xl mb-2">{interest.icon}</span>
                      <span className="font-medium">{interest.label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-gray-500">選擇多個興趣可以讓我們為您推薦更多元的旅遊體驗</p>
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-200">旅行細節</h2>
            
            <div className="space-y-8">
              <div>
                <label htmlFor="travelers" className="block text-sm font-medium text-gray-700 mb-1">旅客人數</label>
                <div className="mt-1 flex items-center space-x-4">
                  <div className="flex rounded-lg overflow-hidden shadow-sm border border-gray-300">
                    <button
                      type="button"
                      onClick={() => handleTravelersChange(plan.travelers - 1)}
                      className="w-12 h-12 flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={plan.travelers <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <div className="flex items-center justify-center w-16 text-center text-lg font-medium">
                      {plan.travelers}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTravelersChange(plan.travelers + 1)}
                      className="w-12 h-12 flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={plan.travelers >= 10}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>最多可選擇10人</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">請選擇參與此次旅行的總人數</p>
              </div>

              <div>
                <label htmlFor="preference" className="block text-sm font-medium text-gray-700 mb-1">您希望的旅行節奏是？</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-xl">
                  {preferenceOptions.map(option => (
                    <div
                      key={option.id}
                      className={`
                        p-4 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col items-center
                        ${plan.preference === option.id
                          ? 'bg-blue-100 border-blue-500 text-blue-800 shadow-md'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                      `}
                      onClick={() => handleInputChange({
                        target: { name: 'preference', value: option.id }
                      } as React.ChangeEvent<HTMLSelectElement>)}
                    >
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs mt-1 text-center">
                        {option.id === 'relaxed' && '每天安排較少景點，充分休息'}
                        {option.id === 'balanced' && '景點與休息時間平衡安排'}
                        {option.id === 'intensive' && '一天內安排較多景點，充分利用時間'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="companions" className="block text-sm font-medium text-gray-700 mb-1">您將與誰同行？</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-3xl">
                  {companionOptions.map(option => (
                    <div
                      key={option.id}
                      className={`
                        p-3 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col items-center
                        ${plan.companions === option.id
                          ? 'bg-blue-100 border-blue-500 text-blue-800 shadow-md'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                      `}
                      onClick={() => handleInputChange({
                        target: { name: 'companions', value: option.id }
                      } as React.ChangeEvent<HTMLSelectElement>)}
                    >
                      <span className="font-medium">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // 計算旅行天數
  const getTripDuration = (): number => {
    if (!plan.startDate || !plan.endDate) return 1; // 默認為 1 天
    
    // 直接解析日期，避免時區問題
    const [startYear, startMonth, startDay] = plan.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = plan.endDate.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 計算天數（包括起始日）
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">建立您的夢想旅程</h1>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
              告訴我們您的喜好和期望，我們將為您量身打造一趟完美的旅行計劃
            </p>
          </div>
          
          {/* 步驟進度條 */}
          <div className="mb-10">
            <div className="flex justify-between items-center">
              {[1, 2, 3].map((step) => (
                <div key={step} className="text-center relative z-10 flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full shadow-md transition-all duration-300 
                    ${currentStep >= step 
                      ? 'bg-blue-600 text-white transform scale-110' 
                      : 'bg-white text-gray-500 border border-gray-200'}`}
                  >
                    {step}
                  </div>
                  <div className={`mt-2 font-medium text-sm
                    ${currentStep >= step ? 'text-blue-800' : 'text-gray-500'}`}>
                    {step === 1 && '目的地和日期'}
                    {step === 2 && '興趣和預算'}
                    {step === 3 && '旅行細節'}
                  </div>
                </div>
              ))}
            </div>
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full h-1 bg-gray-200 rounded-full"></div>
              </div>
              <div className="relative flex justify-between">
                <div className={`w-0 h-1 ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'} rounded-full transition-all duration-500`} style={{width: `${(currentStep - 1) * 50}%`}}></div>
              </div>
            </div>
          </div>
          
          {/* 表單內容 */}
          <div className="bg-white shadow-lg rounded-xl p-8 mb-8 transition-all duration-300 transform hover:shadow-xl">
            {renderStep()}
            
            {error && (
              <div 
                id="error-message"
                className="mt-6 flex items-center p-4 rounded-md bg-red-50 text-red-700 border border-red-200 animate-fade-in"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
            
            {/* 按鈕區域 */}
            <div className="mt-10 flex justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  上一步
                </button>
              ) : (
                <div></div>
              )}
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-3 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 flex items-center"
                >
                  下一步
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 flex items-center disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      生成中...
                    </>
                  ) : (
                    <>
                      生成旅行計劃
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* 提示信息 */}
          <div className="text-center text-sm text-gray-500">
            <p>填寫完畢後，我們將為您生成專屬旅行計劃，您可以隨時修改或分享</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BuildPage; 