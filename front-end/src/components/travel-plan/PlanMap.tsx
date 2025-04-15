import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// 確認 API Key 存在
console.log('Google Maps API Key 存在狀態：', !!GOOGLE_MAPS_API_KEY);

// 為了避免與已有的 Window 類型定義衝突，我們使用 @ts-ignore 來忽略 TypeScript 錯誤
interface MapActivity {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number; // 活動的順序編號
  type: string;  // 活動類型
  time: string;  // 活動時間
  place_id?: string; // Google Maps 地點 ID
}

interface PlaceDetails {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  rating?: number;
  website?: string;
  photos?: google.maps.places.PlacePhoto[];
  opening_hours?: any;
  types?: string[];
  reviews?: google.maps.places.PlaceReview[];
  url?: string;
  vicinity?: string;
  price_level?: number;
  international_phone_number?: string;
  business_status?: string; // 營業狀態，例如 "OPERATIONAL"
  permanently_closed?: boolean;
  wheelchair_accessible_entrance?: boolean;
  delivery?: boolean;
  dine_in?: boolean;
  takeout?: boolean;
  serves_breakfast?: boolean;
  serves_lunch?: boolean;
  serves_dinner?: boolean;
  address_components?: google.maps.GeocoderAddressComponent[];
  utc_offset_minutes?: number;
}

interface PlanMapProps {
  activities: MapActivity[];
  destination: string;
}

// 定義全局回調函數，確保只有一個實例
declare global {
  interface Window {
    initSimpleMap: () => void;
  }
}

const PlanMap: React.FC<PlanMapProps> = ({ activities, destination }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapActivity | null>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [enhancedView, setEnhancedView] = useState<boolean>(true); // 新增狀態以控制增強視圖
  const [showAllReviews, setShowAllReviews] = useState<boolean>(false); // 新增狀態以控制顯示所有評論
  
  // 默認地圖中心點 - 台北市中心
  const defaultCenter = { lat: 25.0330, lng: 121.5654 };
  
  // 檢查 API Key 並設置載入狀態
  useEffect(() => {
    // 檢查 API Key
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API Key 未設置');
      setError('未設置 Google Maps API Key，請檢查環境變數設定');
      return;
    }
    
    // 檢查活動數據
    if (activities && activities.length > 0) {
      const validActivitiesCount = activities.filter(activity => 
        activity.lat && activity.lng && !isNaN(activity.lat) && !isNaN(activity.lng)
      ).length;
      
      console.log(`活動總數: ${activities.length}, 有效座標活動數: ${validActivitiesCount}`);
      
      if (validActivitiesCount === 0) {
        console.warn('沒有找到有效的活動座標');
      }
    } else {
      console.warn('沒有提供活動數據');
    }
    
    // 檢查地圖容器
    if (mapContainerRef.current) {
      const { clientWidth, clientHeight } = mapContainerRef.current;
      console.log(`地圖容器尺寸: ${clientWidth}x${clientHeight}`);
      
      if (clientWidth === 0 || clientHeight === 0) {
        console.error('地圖容器尺寸為零');
        setError('地圖容器尺寸不正確，請確保容器有合適的寬度和高度');
        return;
      }
    }
    
    // 模擬地圖載入過程
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [activities]);
  
  // 活動類型對應的標記顏色
  const getMarkerColor = (type: string): string => {
    const colors: Record<string, string> = {
      '景點': '#4285F4', // 藍色
      '餐廳': '#EA4335', // 紅色
      '購物': '#FBBC04', // 黃色
      '住宿': '#34A853', // 綠色
      '交通': '#8B44CE', // 紫色
      '活動': '#FF7F00', // 橙色
    };
    
    return colors[type] || '#FF5252'; // 默認紅色
  };
  
  // 計算地圖邊界以顯示所有標記
  const getBounds = () => {
    if (!activities || activities.length === 0) {
      console.log('無活動數據，使用默認設置');
      return null;
    }
    
    const validActivities = activities.filter(activity => 
      activity.lat && activity.lng && !isNaN(activity.lat) && !isNaN(activity.lng)
    );
    
    if (validActivities.length === 0) {
      console.log('無有效座標的活動，使用默認設置');
      return null;
    }
    
    // 優先顯示第一個活動點（按 order 排序）
    if (validActivities.length >= 1) {
      // 對活動按 order 屬性排序
      const sortedActivities = [...validActivities].sort((a, b) => a.order - b.order);
      const firstActivity = sortedActivities[0];
      
      console.log(`優先顯示第一個順序的活動: ${firstActivity.name}, 順序: ${firstActivity.order}, 位置: (${firstActivity.lat}, ${firstActivity.lng})`);
      return {
        center: { lat: firstActivity.lat, lng: firstActivity.lng },
        zoom: 15  // 使用更高的縮放級別以便更清晰地查看該點
      };
    }
    
    // 如果沒有按 order 排序的邏輯（作為備用），仍然計算所有點的邊界
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minLng = Number.MAX_VALUE;
    let maxLng = Number.MIN_VALUE;
    
    validActivities.forEach(activity => {
      minLat = Math.min(minLat, activity.lat);
      maxLat = Math.max(maxLat, activity.lat);
      minLng = Math.min(minLng, activity.lng);
      maxLng = Math.max(maxLng, activity.lng);
    });
    
    console.log(`計算的邊界: 緯度(${minLat}-${maxLat}), 經度(${minLng}-${maxLng})`);
    
    // 返回邊界中心點
    return {
      center: { 
        lat: (minLat + maxLat) / 2, 
        lng: (minLng + maxLng) / 2 
      },
      zoom: 12  // 適當的縮放比例
    };
  };
  
  // 處理資料驗證
  const validActivities = activities.filter(activity => 
    activity.lat && activity.lng && !isNaN(activity.lat) && !isNaN(activity.lng)
  );
  
  // 計算地圖中心
  const mapCenter = getBounds()?.center || defaultCenter;
  
  // 處理地點信息查詢
  const handlePlaceDetails = (activity: MapActivity) => {
    console.log(`查詢地點信息: ${activity.name}`);
    setSelectedMarker(activity);
    setPlaceDetails(null); // 清除之前的詳情
    
    if (!placesService) {
      console.error('Places 服務未初始化');
      return;
    }
    
    // 如果活動有 place_id，直接使用它
    if (activity.place_id) {
      placesService.getDetails(
        { 
          placeId: activity.place_id,
          fields: [
            'name', 
            'formatted_address', 
            'formatted_phone_number', 
            'rating', 
            'opening_hours', 
            'website', 
            'photos', 
            'types',
            'reviews',
            'url',
            'vicinity',
            'price_level',
            'international_phone_number',
            'business_status',
            'address_components',
            'utc_offset_minutes',
            'user_ratings_total'
          ]
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            console.log('獲取到地點詳情:', place);
            // @ts-ignore - 跳過類型檢查，因為 Google Places API 返回的數據可能包含未在類型定義中列出的字段
            setPlaceDetails({
              name: place.name,
              formatted_address: place.formatted_address,
              formatted_phone_number: place.formatted_phone_number,
              rating: place.rating,
              website: place.website,
              photos: place.photos,
              opening_hours: place.opening_hours,
              types: place.types,
              reviews: place.reviews,
              url: place.url,
              vicinity: place.vicinity,
              price_level: place.price_level,
              international_phone_number: place.international_phone_number,
              business_status: place.business_status,
              // @ts-ignore
              wheelchair_accessible_entrance: place.wheelchair_accessible_entrance,
              // @ts-ignore
              delivery: place.delivery,
              // @ts-ignore
              dine_in: place.dine_in,
              // @ts-ignore
              takeout: place.takeout,
              // @ts-ignore
              serves_breakfast: place.serves_breakfast,
              // @ts-ignore
              serves_lunch: place.serves_lunch,
              // @ts-ignore
              serves_dinner: place.serves_dinner,
              address_components: place.address_components,
              utc_offset_minutes: place.utc_offset_minutes
            });
          } else {
            console.error('無法獲取地點詳情，回退到地點搜索', status);
            // 如果沒有 place_id 或找不到詳情，嘗試搜索
            searchNearbyPlace(activity);
          }
        }
      );
    } else {
      // 如果沒有 place_id，按名稱和位置搜索
      searchNearbyPlace(activity);
    }
  };
  
  // 按名稱和位置搜索附近地點
  const searchNearbyPlace = (activity: MapActivity) => {
    if (!placesService) return;
    
    // 首先嘗試文本搜索
    placesService.findPlaceFromQuery(
      {
        query: activity.name,
        fields: ['place_id', 'name', 'formatted_address', 'geometry'],
        locationBias: new google.maps.LatLng(activity.lat, activity.lng) // 添加位置偏好
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          console.log('文本搜索結果:', results);
          
          // 確保 place_id 存在
          if (results[0].place_id) {
            // 使用找到的 place_id 獲取詳細信息
            placesService.getDetails(
              {
                placeId: results[0].place_id,
                fields: [
                  'name', 
                  'formatted_address', 
                  'formatted_phone_number', 
                  'rating', 
                  'opening_hours', 
                  'website', 
                  'photos', 
                  'types',
                  'reviews',
                  'url',
                  'vicinity',
                  'price_level',
                  'international_phone_number'
                ]
              },
              (place, detailStatus) => {
                if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                  setPlaceDetails({
                    name: place.name,
                    formatted_address: place.formatted_address,
                    formatted_phone_number: place.formatted_phone_number,
                    rating: place.rating,
                    website: place.website,
                    photos: place.photos,
                    opening_hours: place.opening_hours,
                    types: place.types,
                    reviews: place.reviews,
                    url: place.url,
                    vicinity: place.vicinity,
                    price_level: place.price_level,
                    international_phone_number: place.international_phone_number
                  });
                } else {
                  // 如果獲取詳情失敗，至少顯示基本信息
                  setPlaceDetails({
                    name: results[0].name,
                    formatted_address: results[0].formatted_address
                  });
                }
              }
            );
          } else {
            // 沒有 place_id，使用基本信息
            setPlaceDetails({
              name: results[0].name,
              formatted_address: results[0].formatted_address
            });
          }
        } else {
          console.log('找不到匹配的地點，使用活動基本信息');
          // 使用活動的基本信息
          setPlaceDetails({
            name: activity.name
          });
        }
      }
    );
  };
  
  // 初始化 Places 服務
  const initPlacesService = (map: google.maps.Map) => {
    if (map && !placesService && window.google?.maps?.places) {
      console.log('初始化 Places 服務');
      const service = new google.maps.places.PlacesService(map);
      setPlacesService(service);
    }
  };
  
  // 錯誤顯示
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-center text-red-600 h-full flex items-center justify-center" style={{ minHeight: '500px' }}>
        <div>
          <p className="font-semibold mb-2">{error}</p>
          <p className="text-sm mb-3">請確認您的網絡連接和 API Key 配置</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md"
          >
            重新載入頁面
          </button>
        </div>
      </div>
    );
  }
  
  // 沒有 API Key
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg text-center text-yellow-700 h-full flex items-center justify-center" style={{ minHeight: '500px' }}>
        <div>
          <p className="font-semibold">地圖服務未設置</p>
          <p className="text-sm">請設定 Google Maps API Key</p>
        </div>
      </div>
    );
  }
  
  // 載入中顯示
  if (isLoading) {
    return (
      <div className="w-full h-full rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center" style={{ minHeight: '500px', height: '500px' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-500 border-t-gray-200 mb-2"></div>
          <p className="text-gray-600">正在載入地圖...</p>
        </div>
      </div>
    );
  }
  
  // 沒有有效活動數據
  if (validActivities.length === 0) {
    return (
      <div className="w-full h-full rounded-lg overflow-hidden border border-gray-300 bg-gray-50 flex items-center justify-center" style={{ minHeight: '500px', height: '500px' }}>
        <div className="text-center p-4">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
          </svg>
          <p className="font-semibold text-gray-600">沒有可顯示的地點</p>
          <p className="text-sm text-gray-500 mt-1">請添加具有有效座標的活動</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={mapContainerRef}
      className="w-full rounded-lg overflow-hidden border border-gray-300" 
      style={{ minHeight: '500px', height: '500px' }}
    >
      <APIProvider 
        apiKey={GOOGLE_MAPS_API_KEY}
        onLoad={() => console.log('Google Maps API 已載入')}
        onError={(error: Error) => {
          console.error('Google Maps API 載入失敗:', error);
          setError(`Google Maps API 載入失敗: ${error.message || '未知錯誤'}`);
        }}
        // 確保 Places 庫被加載
        libraries={['places']}
      >
        <MapWithPlaces 
          mapCenter={mapCenter} 
          zoom={getBounds()?.zoom || 10} 
          activities={validActivities} 
          getMarkerColor={getMarkerColor}
          selectedMarker={selectedMarker}
          placeDetails={placeDetails}
          onMapLoad={(map) => {
            console.log('地圖已完成載入和渲染');
            mapRef.current = map;
            initPlacesService(map);
            setMapReady(true);
          }}
          onMarkerClick={(activity) => {
            if (mapRef.current) {
              handlePlaceDetails(activity);
            }
          }}
          onInfoWindowClose={() => {
            setSelectedMarker(null);
            setPlaceDetails(null);
            setShowAllReviews(false); // 關閉評論面板
          }}
          enhancedView={enhancedView}
          toggleEnhancedView={() => setEnhancedView(!enhancedView)}
          showAllReviews={showAllReviews}
          toggleAllReviews={() => setShowAllReviews(!showAllReviews)}
        />
      </APIProvider>
    </div>
  );
};

// 地圖組件，用於訪問地圖實例
interface MapWithPlacesProps {
  mapCenter: { lat: number; lng: number };
  zoom: number;
  activities: MapActivity[];
  getMarkerColor: (type: string) => string;
  selectedMarker: MapActivity | null;
  placeDetails: PlaceDetails | null;
  onMapLoad: (map: google.maps.Map) => void;
  onMarkerClick: (activity: MapActivity) => void;
  onInfoWindowClose: () => void;
  enhancedView: boolean;
  toggleEnhancedView: () => void;
  showAllReviews: boolean;
  toggleAllReviews: () => void;
}

// 生成評分星星
const renderRatingStars = (rating: number | undefined) => {
  if (!rating) return null;
  
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <svg key={`full-${i}`} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
        </svg>
      ))}
      
      {halfStar && (
        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half-star" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#D1D5DB" />
            </linearGradient>
          </defs>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" fill="url(#half-star)"></path>
        </svg>
      )}
      
      {[...Array(emptyStars)].map((_, i) => (
        <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
        </svg>
      ))}
      
      {rating !== undefined && (
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      )}
    </div>
  );
};

const MapWithPlaces: React.FC<MapWithPlacesProps> = ({ 
  mapCenter, 
  zoom, 
  activities, 
  getMarkerColor,
  selectedMarker,
  placeDetails,
  onMapLoad,
  onMarkerClick,
  onInfoWindowClose,
  enhancedView,
  toggleEnhancedView,
  showAllReviews,
  toggleAllReviews
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      onMapLoad(map);
      
      // 添加點擊地圖空白處關閉資訊窗口的功能
      map.addListener('click', () => {
        if (selectedMarker) {
          onInfoWindowClose();
        }
      });
    }
  }, [map, onMapLoad, selectedMarker, onInfoWindowClose]);
  
  // 添加按ESC鍵關閉資訊窗口的功能
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedMarker) {
        onInfoWindowClose();
      }
    };
    
    window.addEventListener('keydown', handleEscKey);
    
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [selectedMarker, onInfoWindowClose]);

  // 渲染單個評論
  const renderReviewItem = (review: google.maps.places.PlaceReview, index: number) => {
    return (
      <div key={index} className={`p-3 rounded-lg ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} mb-3`}>
        <div className="flex items-center mb-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-2">
            {review.author_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-medium">{review.author_name || '匿名使用者'}</div>
            <div className="flex text-xs text-gray-500">
              <span>{review.time ? new Date(review.time * 1000).toLocaleDateString() : '未知日期'}</span>
              <span className="mx-1">•</span>
              <span className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg 
                    key={i} 
                    className={`w-3 h-3 ${i < (review.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                ))}
              </span>
            </div>
          </div>
        </div>
        <div className="text-sm">{review.text || '沒有評論內容'}</div>
      </div>
    );
  };

  return (
    <Map
      defaultCenter={mapCenter}
      defaultZoom={zoom}
      gestureHandling={'cooperative'}
      disableDefaultUI={false}
      mapId={'travel-plan-map'}
      fullscreenControl={true}
      mapTypeId={'roadmap'}
      mapTypeControl={false}
      style={{ width: '100%', height: '100%' }}
      onError={(error: Error) => {
        console.error('地圖渲染錯誤:', error);
      }}
    >
      {activities.map((activity) => (
        <AdvancedMarker
          key={activity.id}
          position={{ lat: activity.lat, lng: activity.lng }}
          title={`${activity.order}. ${activity.name}`}
          onClick={() => onMarkerClick(activity)}
        >
          <Pin
            background={getMarkerColor(activity.type)}
            glyphColor={'#FFF'}
            scale={1.2}
            borderColor={'#FFF'}
          >
            {activity.order}
          </Pin>
        </AdvancedMarker>
      ))}
      
      {selectedMarker && (
        <InfoWindow
          position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
          onCloseClick={onInfoWindowClose}
          maxWidth={450}
        >
          <div className="p-3">
            {/* 評論彈窗 */}
            {showAllReviews && placeDetails?.reviews && placeDetails.reviews.length > 0 && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center border-b p-4">
                    <h3 className="font-bold text-lg">所有評論 ({placeDetails.reviews.length})</h3>
                    <button 
                      onClick={toggleAllReviews}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="overflow-y-auto p-4 flex-grow">
                    {placeDetails.reviews.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        尚無評論
                      </div>
                    ) : (
                      placeDetails.reviews.map((review, index) => renderReviewItem(review, index))
                    )}
                  </div>
                  <div className="border-t p-3 text-center">
                    <button 
                      onClick={toggleAllReviews}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
                    >
                      關閉
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {placeDetails ? (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-base">{placeDetails.name || selectedMarker.name}</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={toggleEnhancedView}
                      className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-2 py-1 rounded-full flex items-center"
                    >
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        {enhancedView ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        )}
                      </svg>
                      {enhancedView ? '簡化視圖' : '詳細視圖'}
                    </button>
                  </div>
                </div>
                
                <div className="text-gray-600 text-sm">
                  {/* 照片展示 */}
                  {placeDetails.photos && placeDetails.photos.length > 0 && (
                    <div className="w-full h-48 overflow-hidden rounded-lg mb-3 relative">
                      <img 
                        src={placeDetails.photos[0].getUrl({ maxWidth: 600, maxHeight: 400 })} 
                        alt={placeDetails.name || selectedMarker.name} 
                        className="w-full h-full object-cover"
                      />
                      {placeDetails.photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                          {placeDetails.photos.length} 張照片
                        </div>
                      )}
                    </div>
                  )}

                  {/* 評分和類型 */}
                  <div className="mb-3">
                    <div className="flex items-center mb-1">
                      {placeDetails.rating !== undefined && (
                        <div className="flex items-center">
                          <div className="text-base font-medium mr-1">{placeDetails.rating.toFixed(1)}</div>
                          {renderRatingStars(placeDetails.rating)}
                          <span className="text-xs text-gray-500 ml-1">
                            {/* 使用 user_ratings_total 的回退處理 */}
                            ({placeDetails.reviews ? placeDetails.reviews.length : '暫無'}評價)
                          </span>
                        </div>
                      )}
                      
                      {placeDetails.price_level !== undefined && (
                        <div className="text-gray-600 font-medium ml-auto">
                          {[...Array(placeDetails.price_level)].map((_, i) => '$').join('')}
                        </div>
                      )}
                    </div>
                    
                    {/* 營業狀態指示器 */}
                    {placeDetails.opening_hours && (
                      <div className="mb-1">
                        {placeDetails.opening_hours.isOpen?.(new Date()) ? (
                          <span className="text-sm text-green-700 font-medium">營業中</span>
                        ) : (
                          <span className="text-sm text-red-600 font-medium">休息中</span>
                        )}
                        {placeDetails.opening_hours.weekday_text && 
                          <span className="text-sm text-gray-500 ml-2">
                            · {placeDetails.opening_hours.weekday_text[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].split(': ')[1]}
                          </span>
                        }
                      </div>
                    )}
                    
                    {/* 類型標籤列表 */}
                    {placeDetails.types && placeDetails.types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {placeDetails.types
                          .filter(type => !['point_of_interest', 'establishment'].includes(type))
                          .slice(0, 3)
                          .map((type, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs"
                            >
                              {type.replace(/_/g, ' ')}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  
                  {/* 增強視圖 - 含更豐富資訊 */}
                  {enhancedView ? (
                    <div>
                      {/* 地址信息區 */}
                      <div className="mb-3 border-t border-gray-200 pt-3">
                        {placeDetails.formatted_address && (
                          <div className="flex items-start gap-2 mb-2">
                            <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <div>
                              <div className="text-sm">{placeDetails.formatted_address}</div>
                              <button 
                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeDetails.name || selectedMarker.name)}&query_place_id=${selectedMarker.place_id || ''}`, '_blank')}
                                className="text-xs text-blue-600 mt-1 hover:underline"
                              >
                                在 Google Maps 中查看
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {placeDetails.formatted_phone_number && (
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                            </svg>
                            <div>
                              <a 
                                href={`tel:${placeDetails.formatted_phone_number}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {placeDetails.formatted_phone_number}
                              </a>
                            </div>
                          </div>
                        )}
                        
                        {placeDetails.website && (
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                            </svg>
                            <div>
                              <a 
                                href={placeDetails.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {placeDetails.website.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0]}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 評論 */}
                      {placeDetails.reviews && placeDetails.reviews.length > 0 && (
                        <div className="mb-3 border-t border-gray-200 pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                              </svg>
                              <span className="font-medium">評論</span>
                            </div>
                            <button 
                              onClick={toggleAllReviews}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              查看全部 {placeDetails.reviews.length} 則評論
                            </button>
                          </div>
                          
                          {/* 只顯示第一條評論 */}
                          {placeDetails.reviews[0] && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center mb-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-2">
                                  {placeDetails.reviews[0].author_name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div className="font-medium">{placeDetails.reviews[0].author_name || '匿名使用者'}</div>
                                  <div className="flex text-xs text-gray-500">
                                    <span>{placeDetails.reviews[0].time ? new Date(placeDetails.reviews[0].time * 1000).toLocaleDateString() : '未知日期'}</span>
                                    <span className="mx-1">•</span>
                                    <span className="flex items-center">
                                      {[...Array(5)].map((_, i) => (
                                        <svg 
                                          key={i} 
                                          // @ts-ignore - TypeScript 無法確定 reviews 是否存在
                                          className={`w-3 h-3 ${i < (placeDetails.reviews[0].rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} 
                                          fill="currentColor" 
                                          viewBox="0 0 20 20"
                                        >
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                        </svg>
                                      ))}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm">
                                {placeDetails.reviews[0].text ? (
                                  placeDetails.reviews[0].text.length > 150 
                                    ? `${placeDetails.reviews[0].text.substring(0, 150)}...` 
                                    : placeDetails.reviews[0].text
                                ) : '沒有評論內容'}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* 簡化視圖內容 */}
                      <div className="my-2">
                        {placeDetails.formatted_address && (
                          <div className="flex items-start gap-1 mb-2">
                            <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <span className="text-xs">{placeDetails.formatted_address}</span>
                          </div>
                        )}
                        
                        {/* 其他簡化視圖內容... */}
                      </div>
                    </div>
                  )}
                  
                  {/* 按鈕區域 */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}&destination_place_id=${selectedMarker.place_id || ''}`, '_blank')}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-2 rounded-md text-sm flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
                      </svg>
                      導航前往
                    </button>
                    
                    <button 
                      onClick={() => window.open(placeDetails.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeDetails.name || selectedMarker.name)}&query_place_id=${selectedMarker.place_id || ''}`, '_blank')}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-2 rounded-md text-sm flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                      </svg>
                      在 Google 中查看
                    </button>
                  </div>
                  
                  {/* 版權聲明 */}
                  <div className="mt-3 text-xs text-gray-400 text-center">
                    信息資料來源於 Google Maps
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-base mb-1">{selectedMarker.name}</h3>
                <div className="text-gray-600 text-sm">
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{selectedMarker.time}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                    </svg>
                    <span>類型: {selectedMarker.type}</span>
                  </div>
                  <div className="flex items-center justify-center mt-3 mb-1">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-sm text-gray-600">正在載入完整資訊...</span>
                  </div>
                  
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedMarker.name)}&query_place_id=${selectedMarker.place_id || ''}`, '_blank')}
                    className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-2 rounded-md text-sm flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
                    </svg>
                    在 Google Maps 中查看
                  </button>
                </div>
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </Map>
  );
};

export default PlanMap; 