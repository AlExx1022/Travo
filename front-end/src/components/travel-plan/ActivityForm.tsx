import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import travelPlanService from '../../services/travelPlanService';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// 定義活動結構
interface Activity {
  id?: string;
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

// ActivityForm 組件屬性
interface ActivityFormProps {
  dayIndex: number;
  onSuccess: () => void;
  onCancel: () => void;
}

// 活動類型選項
const ACTIVITY_TYPES = [
  { value: '景點', label: '景點' },
  { value: '餐廳', label: '餐廳' },
  { value: '住宿', label: '住宿' },
  { value: '交通', label: '交通' },
  { value: '購物', label: '購物' },
  { value: '活動', label: '活動' },
  { value: '其他', label: '其他' }
];

const ActivityForm: React.FC<ActivityFormProps> = ({ dayIndex, onSuccess, onCancel }) => {
  // 獲取計劃ID
  const { planId } = useParams<{ planId: string }>();
  
  // 狀態
  const [loading, setLoading] = useState<boolean>(false);
  const [activity, setActivity] = useState<Activity>({
    name: '',
    location: '',
    type: '景點',
    time: '09:00',
    duration_minutes: 60,
    lat: 0,
    lng: 0,
    place_id: '',
    address: '',
    photos: [],
    description: ''
  });
  
  // 用於處理 Google Places 搜尋
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);

  // 載入 Google Maps API
  useEffect(() => {
    // 檢查是否已載入 Google Maps API
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps API 已載入，嘗試初始化地點自動完成');
      initPlaceAutocomplete();
      return;
    }
    
    console.log('正在動態載入 Google Maps API');
    
    // 定義回調函數
    // @ts-ignore - 忽略 window.initAutocomplete 可能不存在的警告
    window.initAutocomplete = () => {
      console.log("Google Maps API 載入完成");
      initPlaceAutocomplete();
    };
    
    // 定義錯誤處理函數
    const handleScriptError = (error: Event | string) => {
      console.error('Google Maps API 載入失敗:', error);
      toast.error('Google Maps API 載入失敗，請檢查網絡連接');
      
      // 即使載入失敗，也提供一個簡單的輸入框
      if (autocompleteContainerRef.current) {
        createSimpleInputFallback();
      }
    };
    
    // 載入腳本 - 使用與 BuildPage 相同的腳本配置
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=zh-TW&callback=initAutocomplete`;
    script.async = true;
    script.defer = true;
    script.onerror = handleScriptError;
    
    document.head.appendChild(script);
    
    // 設置超時檢測
    const timeoutId = setTimeout(() => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.warn('Google Maps API 載入超時');
        handleScriptError('載入超時');
      }
    }, 10000); // 10秒超時
    
    return () => {
      // 清理資源
      clearTimeout(timeoutId);
      
      // 移除腳本
      const scriptElement = document.querySelector('#google-maps-script');
      if (scriptElement) {
        scriptElement.remove();
      }
      
      // 移除全局回調
      if (window.initAutocomplete) {
        // @ts-ignore - 忽略 window.initAutocomplete 可能不存在的警告
        window.initAutocomplete = undefined;
      }
    };
  }, []);

  // 初始化地點自動完成
  const initPlaceAutocomplete = () => {
    if (!autocompleteContainerRef.current) return;
    
    try {
      console.log('初始化 Google Places 自動完成');
      
      // 清空容器
      autocompleteContainerRef.current.innerHTML = '';
      
      // 檢查 Google Places API 是否正確載入
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error('Google Maps API 未正確載入');
        throw new Error('Google Maps API 未正確載入');
      }

      // 創建輸入框
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
      input.placeholder = '輸入地點名稱進行搜尋...';
      
      // 防止在搜尋框按 Enter 鍵時觸發表單提交
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          return false;
        }
      });
      
      // 添加輸入框到容器
      autocompleteContainerRef.current.appendChild(input);
      
      // 確保輸入框不會被灰色禁用
      input.setAttribute('autocomplete', 'off');
      
      // 創建 Autocomplete 實例
      const options = {
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'photos', 'vicinity', 'types']
      };
      
      // @ts-ignore - 忽略 window.google.maps.places.Autocomplete 可能類型不匹配的警告
      const autocomplete = new window.google.maps.places.Autocomplete(input, options);
      
      // 存儲 autocomplete 引用以便後續訪問
      autocompleteRef.current = autocomplete;
      
      // 監聽選擇事件
      autocomplete.addListener('place_changed', () => {
        try {
          const place = autocomplete.getPlace();
          console.log("選擇的地點:", place);
          
          // 從輸入框文本中提取主要名稱
          const inputValue = input.value;
          
          // 獲取最後一個實體名稱（通常是主要場所名稱）
          // 例如從「日本京都府京都市左京區 Okazaki Enshōjichō, 124 京都市京瓷美術館」提取「京都市京瓷美術館」
          let simpleName = '';
          
          // 提取簡潔的地點名稱
          if (place && place.name) {
            // 優先使用 place 物件中的名稱
            simpleName = place.name;
          } else {
            // 從輸入值中提取
            // 移除數字和標點符號
            const cleanInput = inputValue.replace(/\d+/g, '').trim();
            
            // 嘗試從地址中提取主要地點名稱
            if (cleanInput.includes('台灣') || cleanInput.includes('縣') || cleanInput.includes('市') || cleanInput.includes('區')) {
              // 嘗試找出最後的實體名稱
              const nameRegex = /(?:.*[縣市區鄉鎮村])(.*)/;
              const match = cleanInput.match(nameRegex);
              if (match && match[1] && match[1].trim() !== '') {
                simpleName = match[1].trim();
              }
            } else {
              // 方法1: 基於常見的地點格式，嘗試提取最後部分
              const parts = cleanInput.split(/[,，、]/); // 按逗號分割
              
              // 如果分割後有多個部分，取最後一個（通常是場所名稱）
              if (parts.length > 1) {
                simpleName = parts[parts.length - 1].trim();
              } else {
                // 方法2: 如果沒有分割成功，嘗試從最後一個空格後開始
                const spaceIndex = cleanInput.lastIndexOf(' ');
                if (spaceIndex !== -1) {
                  simpleName = cleanInput.substring(spaceIndex).trim();
                } else {
                  // 如果以上都失敗，使用整個輸入值
                  simpleName = cleanInput;
                }
              }
            }
          }
          
          // 確保名稱不為空
          if (!simpleName) {
            simpleName = inputValue;
          }
          
          console.log('提取的簡短名稱:', simpleName);
          
          if (place && (place.place_id || place.name)) {
            // 創建一個新的地點對象，使用提取的簡短名稱作為顯示名稱
            const enhancedPlace = {
              ...place,
              originalName: place.name, // 保留原始名稱
              name: simpleName // 使用提取的簡短名稱
            };
            
            processPlaceDetails(enhancedPlace, simpleName);
            toast.success(`已選擇地點: ${simpleName}`);
          } else {
            // 如果沒有獲取到地點或獲取的地點不完整，使用輸入值作為地點名稱
            if (inputValue && inputValue.trim() !== '') {
              const simplePlace = {
                name: simpleName,
                formatted_address: place?.formatted_address || inputValue,
                place_id: place?.place_id || ''
              };
              processPlaceDetails(simplePlace, simpleName);
              toast.success(`已使用輸入值: ${simpleName}`);
            } else {
              console.error('輸入值為空，無法創建地點');
              toast.error('請輸入地點名稱');
            }
          }
        } catch (error) {
          console.error('處理 place_changed 事件時出錯:', error);
          
          // 兜底：直接使用輸入框的值
          if (input && input.value) {
            const inputValue = input.value;
            let simpleName = inputValue;
            
            // 嘗試從地址中提取主要地點名稱
            if (inputValue.includes('台灣') || inputValue.includes('縣') || inputValue.includes('市') || inputValue.includes('區')) {
              // 嘗試找出最後的實體名稱
              const nameRegex = /(?:.*[縣市區鄉鎮村])(.*)/;
              const match = inputValue.match(nameRegex);
              if (match && match[1] && match[1].trim() !== '') {
                simpleName = match[1].trim();
              }
            } else {
              // 嘗試提取最後的場所名稱
              const parts = inputValue.split(/[,，、\s]/);
              if (parts.length > 1) {
                simpleName = parts[parts.length - 1].trim();
              }
            }
            
            processPlaceDetails({
              name: simpleName,
              formatted_address: inputValue,
              place_id: ''
            }, simpleName);
            toast.success(`已使用輸入值: ${simpleName}`);
          } else {
            toast.error('無法處理所選地點，請重新輸入');
          }
        }
      });
      
      console.log('Places Autocomplete 初始化成功');
    } catch (error) {
      console.error('初始化地點自動完成時出錯:', error);
      toast.error('載入地點搜尋功能時發生問題');
      
      // 提供備用的純文本輸入框
      createSimpleInputFallback();
    }
  };
  
  // 創建簡單輸入框後備方案
  const createSimpleInputFallback = () => {
    if (!autocompleteContainerRef.current) return;
    
    console.log('建立簡單輸入框後備方案');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
    input.placeholder = '輸入地點名稱 (地點搜尋無法載入)';
    
    // 防止在輸入框按 Enter 鍵時觸發表單提交
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // 當按 Enter 時，觸發處理輸入值
        processInputValue();
        return false;
      }
    });
    
    // 清空容器並添加輸入框
    autocompleteContainerRef.current.innerHTML = '';
    autocompleteContainerRef.current.appendChild(input);
    
    // 添加一個簡單的提示
    const helpText = document.createElement('p');
    helpText.className = 'text-xs text-gray-500 mt-1';
    helpText.textContent = '地點搜尋功能無法載入，請手動輸入地點名稱。';
    autocompleteContainerRef.current.appendChild(helpText);
    
    // 處理輸入值的函數
    const processInputValue = () => {
      if (input && input.value) {
        const inputValue = input.value.trim();
        if (inputValue) {
          // 提取簡潔的地點名稱
          let simpleName = inputValue;
          
          // 嘗試從地址中提取主要地點名稱
          if (inputValue.includes('台灣') || inputValue.includes('縣') || inputValue.includes('市') || inputValue.includes('區')) {
            // 嘗試找出最後的實體名稱
            const nameRegex = /(?:.*[縣市區鄉鎮村])(.*)/;
            const match = inputValue.match(nameRegex);
            if (match && match[1] && match[1].trim() !== '') {
              simpleName = match[1].trim();
            }
          } else {
            // 嘗試提取最後的場所名稱
            const parts = inputValue.split(/[,，、\s]/);
            if (parts.length > 1) {
              simpleName = parts[parts.length - 1].trim();
            }
          }
          
          console.log('提取的簡短名稱:', simpleName);
          
          // 創建簡單的地點對象，使用提取的簡短名稱作為名稱
          const simplePlace = {
            name: simpleName,
            formatted_address: inputValue,
            place_id: ''
          };
          
          // 處理地點詳情，將提取的簡短名稱傳入
          processPlaceDetails(simplePlace, simpleName);
          toast.success(`已使用地點名稱: ${simpleName}`);
        }
      }
    };
    
    // 添加失去焦點事件處理
    input.addEventListener('blur', processInputValue);
    
    // 添加事件監聽器以便用戶可以手動設置地點名稱
    input.addEventListener('change', processInputValue);
  };
  
  // 處理地點詳情
  const processPlaceDetails = (place: any, simpleName?: string) => {
    try {
      console.log('處理地點詳情:', place);
      console.log('簡短名稱:', simpleName);
      
      if (!place) {
        console.error('processPlaceDetails: place 是 null 或 undefined');
        toast.error('無法處理空的地點詳情');
        return;
      }
      
      // 提取照片URL，最多獲取3張
      const photoUrls: string[] = [];
      if (place.photos && place.photos.length > 0) {
        try {
          const maxPhotos = Math.min(3, place.photos.length);
          for (let i = 0; i < maxPhotos; i++) {
            const photo = place.photos[i];
            // 檢查 photo 是否有 getUrl 方法
            if (photo && typeof photo.getUrl === 'function') {
              try {
                // 使用 Google Photos API 獲取照片 URL
                const photoUrl = photo.getUrl({ maxWidth: 1200, maxHeight: 800 });
                if (photoUrl) {
                  photoUrls.push(photoUrl);
                }
              } catch (photoError) {
                console.error('獲取照片 URL 時出錯:', photoError);
              }
            }
          }
        } catch (photosError) {
          console.error('處理照片數組時出錯:', photosError);
        }
      }
      
      // 確定位置 (處理不同格式)
      let lat = 0;
      let lng = 0;
      
      try {
        if (place.geometry && place.geometry.location) {
          // Google Maps 標準 API 返回的位置
          if (typeof place.geometry.location.lat === 'function') {
            lat = place.geometry.location.lat();
            lng = place.geometry.location.lng();
          } else if (typeof place.geometry.location.lat === 'number') {
            lat = place.geometry.location.lat;
            lng = place.geometry.location.lng;
          }
        }
      } catch (locationError) {
        console.error('獲取地點坐標時出錯:', locationError);
      }
      
      // 獲取評分
      let rating = undefined;
      if (typeof place.rating === 'number') {
        rating = place.rating;
      }
      
      // 獲取地址
      let address = '';
      if (place.formatted_address) {
        address = place.formatted_address;
      } else if (place.vicinity) {
        address = place.vicinity;
      }
      
      // 提取最簡潔的地點名稱
      let placeName = '';
      
      // 1. 首先使用傳入的簡短名稱（如果有）
      if (simpleName) {
        placeName = simpleName;
      } 
      // 2. 其次使用 place.name（通常是最簡潔的官方名稱）
      else if (place.name) {
        placeName = place.name;
      }
      // 3. 從完整地址中提取最後部分作為備用
      else if (address) {
        // 根據地址格式嘗試提取主要地點名稱
        const addressParts = address.split(/[,，、\s]/);
        // 取最後一個非空部分
        for (let i = addressParts.length - 1; i >= 0; i--) {
          if (addressParts[i].trim()) {
            placeName = addressParts[i].trim();
            break;
          }
        }
      }
      
      // 4. 如果以上都失敗，使用默認值
      if (!placeName) {
        placeName = '未命名地點';
      }
      
      // 進一步處理：移除地址中可能包含的縣市區域等資訊
      // 例如從「台灣高雄市左營區博愛二路高雄巨蛋」提取「高雄巨蛋」
      if (placeName.includes('台灣') || placeName.includes('縣') || placeName.includes('市') || placeName.includes('區')) {
        // 嘗試找出最後的實體名稱
        const nameRegex = /(?:.*[縣市區鄉鎮村])(.*)/;
        const match = placeName.match(nameRegex);
        if (match && match[1] && match[1].trim() !== '') {
          placeName = match[1].trim();
        }
      }
      
      console.log('最終處理後的地點名稱:', placeName);
      
      // 根據地點類型推斷活動類型
      let activityType = activity.type; // 預設保持原來的活動類型
      
      if (place.types && Array.isArray(place.types)) {
        if (place.types.includes('lodging') || place.types.includes('hotel')) {
          activityType = '住宿';
        } else if (place.types.includes('restaurant') || place.types.includes('food')) {
          activityType = '餐廳';
        } else if (place.types.includes('shopping_mall') || place.types.includes('store')) {
          activityType = '購物';
        } else if (place.types.includes('tourist_attraction') || place.types.includes('museum')) {
          activityType = '景點';
        } else if (place.types.includes('travel_agency') || place.types.includes('transit_station')) {
          activityType = '交通';
        } else if (place.types.includes('amusement_park') || place.types.includes('park')) {
          activityType = '活動';
        }
      }
      
      console.log('處理後的地點名稱:', placeName);
      console.log('處理後的評分:', rating);
      console.log('處理後的地址:', address);
      
      // 更新活動狀態
      setActivity(prev => {
        const updatedActivity = {
          ...prev,
          name: placeName,
          location: placeName,
          place_id: place.place_id || '',
          lat,
          lng,
          address: address,
          rating: rating,
          photos: photoUrls,
          type: activityType // 更新活動類型
        };
        
        console.log('更新活動狀態:', updatedActivity);
        return updatedActivity;
      });
      
      toast.success(`已選擇地點: ${placeName}`);
    } catch (error) {
      console.error('處理地點詳情時出錯:', error);
      toast.error('處理地點詳情時發生問題');
    }
  };
  
  // 處理表單輸入變更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // 特別處理數值型欄位
    if (name === 'duration_minutes') {
      setActivity(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setActivity(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('提交表單，新增活動');
    
    // 驗證必填欄位
    if (!activity.name.trim()) {
      toast.error('請輸入活動名稱');
      return;
    }
    
    if (!planId) {
      toast.error('無法確定要新增活動的旅行計劃');
      return;
    }
    
    // 開始提交
    setLoading(true);
    const savingToast = toast.loading('正在新增活動...');
    
    try {
      console.log(`嘗試新增活動到第 ${dayIndex + 1} 天:`, activity);
      const result = await travelPlanService.addActivity(planId, dayIndex, activity);
      
      console.log('新增活動的API回應:', result);
      
      if (result.success) {
        toast.success('活動新增成功', { id: savingToast });
        onSuccess(); // 通知父組件更新
      } else {
        throw new Error(result.message || '新增活動失敗');
      }
    } catch (error: any) {
      console.error('新增活動時出錯:', error);
      toast.error(`新增活動失敗: ${error.message}`, { id: savingToast });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">新增活動</h3>
      
      <form onSubmit={handleSubmit}>
        {/* 地點搜尋 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            搜尋地點
          </label>
          <div 
            ref={autocompleteContainerRef}
            className="w-full"
          >
            {/* Google Places Autocomplete 將在這裡生成 */}
          </div>
        </div>
        
        {/* 基本資訊區域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* 活動名稱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活動名稱 *
            </label>
            <input
              type="text"
              name="name"
              value={activity.name}
              onChange={handleInputChange}
              placeholder="活動名稱"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 活動類型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活動類型
            </label>
            <select
              name="type"
              value={activity.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ACTIVITY_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* 時間 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              時間
            </label>
            <input
              type="time"
              name="time"
              value={activity.time}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 持續時間 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              持續時間 (分鐘)
            </label>
            <input
              type="number"
              name="duration_minutes"
              value={activity.duration_minutes}
              onChange={handleInputChange}
              min="1"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* 地點資訊區域 - 只能查看，不能直接編輯 */}
        <div className="p-3 bg-gray-50 rounded-md mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">地點資訊</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 地址 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                地址
              </label>
              <div className="px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-700 text-sm">
                {activity.address || '尚未選擇地點'}
              </div>
            </div>
            
            {/* 評分 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                評分
              </label>
              <div className="px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-700 text-sm">
                {activity.rating ? (
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                    <span>{typeof activity.rating === 'number' ? activity.rating.toFixed(1) : activity.rating}</span>
                  </div>
                ) : (
                  <span>無評分</span>
                )}
              </div>
            </div>
          </div>

          {/* 添加地點選擇狀態提示 */}
          {activity.place_id && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center text-green-600 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>已成功選擇地點資訊</span>
              </div>
            </div>
          )}
        </div>
        
        {/* 照片預覽 */}
        {activity.photos.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              地點照片
            </label>
            <div className="grid grid-cols-3 gap-2">
              {activity.photos.map((photo, index) => (
                <div key={index} className="h-24 rounded-md overflow-hidden">
                  <img 
                    src={photo} 
                    alt={`${activity.name || '地點'} 照片 ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 描述 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            活動描述
          </label>
          <textarea
            name="description"
            value={activity.description}
            onChange={handleInputChange}
            rows={3}
            placeholder="添加活動描述..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 按鈕區域 */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                處理中...
              </>
            ) : '新增活動'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityForm;
