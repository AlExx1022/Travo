import React, { useEffect, useRef, useState } from 'react';

// 為了避免與已有的 Window 類型定義衝突，我們使用 @ts-ignore 來忽略 TypeScript 錯誤
interface MapActivity {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number; // 活動的順序編號
  type: string;  // 活動類型
  time: string;  // 活動時間
}

interface PlanMapProps {
  activities: MapActivity[];
  destination: string;
}

const PlanMap: React.FC<PlanMapProps> = ({ activities, destination }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  // @ts-ignore - 忽略 Google Maps 類型問題
  const [map, setMap] = useState<any>(null);
  // @ts-ignore - 忽略 Google Maps 類型問題
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 定義活動類型對應的標記圖標顏色
  const typeColors: Record<string, string> = {
    '景點': 'blue',
    '餐廳': 'orange',
    '購物': 'pink',
    '住宿': 'purple',
    '交通': 'green',
    '活動': 'yellow',
  };

  // 初始化地圖
  useEffect(() => {
    // @ts-ignore - 忽略 Google Maps 類型問題
    if (!window.google || !window.google.maps) {
      setError('Google Maps API 尚未載入');
      return;
    }

    if (!mapRef.current) return;
    
    setLoading(true);
    
    try {
      // 創建地圖實例
      // @ts-ignore - 忽略 Google Maps 類型問題
      const newMap = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 25.0330, lng: 121.5654 }, // 默認中心位置（台北）
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });
      
      setMap(newMap);
      setLoading(false);
    } catch (err) {
      console.error('初始化地圖時出錯:', err);
      setError('無法初始化 Google Maps');
      setLoading(false);
    }
  }, []);

  // 當活動數據改變時，更新標記
  useEffect(() => {
    // @ts-ignore - 忽略 Google Maps 類型問題
    if (!map || !activities || activities.length === 0 || !window.google || !window.google.maps) return;

    // 清除現有標記
    markers.forEach(marker => marker.setMap(null));
    
    // 創建新標記
    const newMarkers: any[] = [];
    // @ts-ignore - 忽略 Google Maps 類型問題
    const bounds = new window.google.maps.LatLngBounds();
    
    // 檢查是否有有效的坐標
    const validActivities = activities.filter(activity => 
      activity.lat && activity.lng && !isNaN(activity.lat) && !isNaN(activity.lng)
    );
    
    if (validActivities.length === 0) {
      console.log('沒有有效的活動坐標');
      
      // 嘗試根據目的地名稱設置地圖中心
      if (destination) {
        // @ts-ignore - 忽略 Google Maps 類型問題
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: destination }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            map.setCenter(results[0].geometry.location);
            map.setZoom(10);
          }
        });
      }
      return;
    }
    
    validActivities.forEach(activity => {
      // 如果坐標無效，則跳過
      if (!activity.lat || !activity.lng || isNaN(activity.lat) || isNaN(activity.lng)) {
        console.warn(`活動 ${activity.name} 的坐標無效:`, activity);
        return;
      }
      
      const position = { lat: activity.lat, lng: activity.lng };
      
      // 獲取標記顏色（根據活動類型）
      const color = typeColors[activity.type] || 'red';
      
      // 創建自定義標記（帶有活動序號）
      const markerLabel = {
        text: activity.order.toString(),
        color: 'white',
        fontWeight: 'bold',
        fontSize: '14px'
      };
      
      // @ts-ignore - 忽略 Google Maps 類型問題
      const marker = new window.google.maps.Marker({
        position,
        map,
        title: `${activity.order}. ${activity.name} (${activity.time})`,
        label: markerLabel,
        icon: {
          // @ts-ignore - 忽略 Google Maps 類型問題
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeWeight: 0,
          scale: 12
        },
        // @ts-ignore - 忽略 Google Maps 類型問題
        animation: window.google.maps.Animation.DROP,
        zIndex: activity.order
      });
      
      // 添加點擊事件以顯示信息窗口
      // @ts-ignore - 忽略 Google Maps 類型問題
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <div style="font-weight: bold; margin-bottom: 4px;">
              ${activity.order}. ${activity.name}
            </div>
            <div style="color: #666; font-size: 12px;">
              ${activity.time} | ${activity.type}
            </div>
          </div>
        `
      });
      
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      
      newMarkers.push(marker);
      bounds.extend(position);
    });
    
    // 調整地圖視角以顯示所有標記
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);
      
      // 如果只有一個標記，設置適當的縮放級別
      if (newMarkers.length === 1) {
        map.setZoom(15);
      }
    }
    
    setMarkers(newMarkers);
    
    // 添加連接標記的路線
    if (validActivities.length > 1) {
      const path = validActivities.map(activity => ({
        lat: activity.lat,
        lng: activity.lng
      }));
      
      // @ts-ignore - 忽略 Google Maps 類型問題
      new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#3B82F6', // 藍色線條
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map
      });
    }
  }, [map, activities, destination]);

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-center text-red-600 h-full flex items-center justify-center">
        <p>{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-500 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
        <p>正在載入地圖...</p>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" style={{ minHeight: '500px' }}></div>
  );
};

export default PlanMap; 