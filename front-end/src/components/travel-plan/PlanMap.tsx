import React, { useEffect, useRef, useState } from 'react';

// 定義活動接口
interface Activity {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
  type: string;
  time?: string;
}

// 定義組件 Props 接口
interface PlanMapProps {
  activities: Activity[];
  destination: string;
}

// 全局變數追蹤 API 載入狀態，防止多次載入
let googleMapsApiLoaded = false;
let googleMapsScriptAdded = false;
// 全局引用以跟蹤腳本元素
let googleMapsScriptElement: HTMLScriptElement | null = null;

// 全局樣式
const globalStyle = `
  gmp-place-details {
    min-width: 300px;
    width: 100%;
    max-width: 350px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    max-height: 600px;
    overflow-y: auto;
    position: relative;
  }
  
  .widget-container {
    margin: 10px;
    position: relative;
  }
  
  .close-details-btn {
    position: absolute;
    right: 10px;
    top: 10px;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    font-size: 18px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  
  .close-details-btn:hover {
    background-color: #f5f5f5;
  }
`;

// 極簡的 Google Maps 類型定義，把實際類型定義留給 TypeScript 推斷
declare global {
  // @ts-ignore - 忽略 Window.google 的類型問題
  interface Window {
    initMap: () => Promise<void>;
    google: any;
  }
}

const PlanMap: React.FC<PlanMapProps> = ({ activities, destination }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const markersRef = useRef<HTMLElement[]>([]);
  const mapElementRef = useRef<HTMLElement | null>(null);
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const eventListenersRef = useRef<any[]>([]);
  const placeDetailsElementRef = useRef<HTMLElement | null>(null);
  const detailsContainerRef = useRef<HTMLDivElement | null>(null);
  const tempMarkerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // 確保活動有有效的經緯度
  const validActivities = activities.filter(
    (activity) => typeof activity.lat === 'number' && typeof activity.lng === 'number'
  );

  // 計算地圖中心點
  const getMapCenter = () => {
    if (validActivities.length === 0) {
      // 如果沒有活動，使用預設的中心點
      return { lat: 25.0330, lng: 121.5654 }; // 台北市中心
    }

    // 使用第一個活動的位置作為中心點，而不是計算平均值
    return {
      lat: validActivities[0].lat,
      lng: validActivities[0].lng
    };
  };

  // 輔助函數：向右偏移經緯度
  const offsetLatLngRight = (latLng: any, longitudeOffset: number): any => {
    const newLng = latLng.lng() + longitudeOffset;
    return new window.google.maps.LatLng(latLng.lat(), newLng);
  };

  // 根據活動類型獲取標記顏色
  const getMarkerColorByType = (type: string): string => {
    // 所有標記都使用相同的藍色
    return '#4285F4'; // Google藍色
    
    /* 原始多彩色標記代碼
    switch (type.toLowerCase()) {
      case 'attraction':
        return '#4285F4'; // 藍色
      case 'restaurant':
        return '#EA4335'; // 紅色
      case 'accommodation':
        return '#FBBC05'; // 黃色
      case 'transport':
        return '#34A853'; // 綠色
      default:
        return '#9C27B0'; // 紫色
    }
    */
  };

  // 添加全局樣式
  useEffect(() => {
    if (!styleElementRef.current) {
      const styleElement = document.createElement('style');
      styleElement.textContent = globalStyle;
      document.head.appendChild(styleElement);
      styleElementRef.current = styleElement;
    }

    return () => {
      if (styleElementRef.current && document.head.contains(styleElementRef.current)) {
        document.head.removeChild(styleElementRef.current);
        styleElementRef.current = null;
      }
    };
  }, []);

  // 加載 Google Maps API
  useEffect(() => {
    const loadGoogleMapsApi = () => {
      // 檢查是否已有正在加載的 API 腳本
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      
      // 如果 API 已經載入，直接調用初始化函數
      if (googleMapsApiLoaded && window.google && window.google.maps) {
        window.initMap();
        return;
      }
      
      // 如果已經存在腳本元素，但 API 尚未加載完成
      if (existingScript || googleMapsScriptAdded) {
        // 等待現有腳本加載完成
        return;
      }
      
      // 防止重複創建自定義元素的錯誤
      if (!window.customElements.get('gmp-map')) {
        // 添加 API 腳本
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=alpha&libraries=maps,places,marker&callback=initMap&loading=async`;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-script'; // 添加 ID 以便於識別
        document.head.appendChild(script);
        
        googleMapsScriptElement = script;
        googleMapsScriptAdded = true;
      }
    };
    
    // 全局初始化函數
    window.initMap = async () => {
      // 防止多次初始化
      if (mapLoaded && mapElementRef.current) return;
      
      try {
        googleMapsApiLoaded = true;
        
        // 動態導入 Google Maps 庫
        // @ts-ignore - 略過類型檢查，我們知道這些是可用的
        const { Map } = await window.google.maps.importLibrary("maps");
        // @ts-ignore
        const { AdvancedMarkerElement, PinElement } = await window.google.maps.importLibrary("marker");
        // @ts-ignore
        const { Place } = await window.google.maps.importLibrary("places");

        if (!mapContainerRef.current) return;
        
        // 清空容器以防止重複創建元素
        mapContainerRef.current.innerHTML = '';

        // 創建地圖元素 - 嚴格按照官方示例結構
        const mapElement = document.createElement('gmp-map') as HTMLElement;
        mapElement.setAttribute('map-id', 'DEMO_MAP_ID');
        
        const center = getMapCenter();
        mapElement.setAttribute('center', `${center.lat}, ${center.lng}`);
        mapElement.setAttribute('zoom', '15'); // 調高初始縮放級別以更好地聚焦於第一個點
        mapContainerRef.current.appendChild(mapElement);
        mapElementRef.current = mapElement;

        // 創建地點詳情容器
        const detailsContainer = document.createElement('div') as HTMLDivElement;
        detailsContainer.className = 'widget-container';
        detailsContainer.setAttribute('slot', 'control-inline-start-block-start');
        detailsContainer.style.display = 'none'; // 初始隱藏
        mapElement.appendChild(detailsContainer);
        detailsContainerRef.current = detailsContainer;

        // 創建關閉按鈕
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-details-btn';
        closeBtn.innerHTML = '✕';
        closeBtn.title = '關閉詳情';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setShowDetails(false);
          if (detailsContainerRef.current) {
            detailsContainerRef.current.style.display = 'none';
          }
          if (tempMarkerRef.current) {
            tempMarkerRef.current.style.display = 'none';
          }
        });
        detailsContainer.appendChild(closeBtn);
        closeButtonRef.current = closeBtn;

        // 創建地點詳情元素
        const placeDetailsElement = document.createElement('gmp-place-details') as HTMLElement;
        
        // 按照官方文檔設置屬性，移除不支持的屬性
        placeDetailsElement.setAttribute('place', '');  // 初始為空，之後會設置
        placeDetailsElement.setAttribute('language', 'zh-TW'); // 保留語言設置
        
        // 使用官方支持的屬性
        placeDetailsElement.setAttribute('condensed', 'false');
        placeDetailsElement.setAttribute('full-width', 'true');
        
        // 只設置官方支持的信息段顯示
        placeDetailsElement.setAttribute('show-reviews-by-default', 'true');
        placeDetailsElement.setAttribute('show-directions', 'true');
        placeDetailsElement.setAttribute('show-share', 'true');
        placeDetailsElement.setAttribute('show-phone', 'true');
        placeDetailsElement.setAttribute('show-hours', 'true');
        
        detailsContainer.appendChild(placeDetailsElement);
        placeDetailsElementRef.current = placeDetailsElement;

        // 創建臨時標記 - 用於顯示當前選中的位置
        const tempMarker = document.createElement('gmp-advanced-marker') as HTMLElement;
        tempMarker.style.display = 'none'; // 初始狀態為隱藏
        mapElement.appendChild(tempMarker);
        tempMarkerRef.current = tempMarker;

        // 等待地圖加載完成
        await new Promise<void>((resolve) => {
          const checkMapLoaded = () => {
            if ((mapElement as any).innerMap) {
              resolve();
            } else {
              setTimeout(checkMapLoaded, 100);
            }
          };
          checkMapLoaded();
        });

        // 獲取內部地圖實例
        const map = (mapElement as any).innerMap;

        // 隱藏地圖類型控制，與官方文檔一致
        map.setOptions({ mapTypeControl: false });

        // 清空先前的標記引用
        markersRef.current = [];
        
        // 創建進階標記元素
        validActivities.forEach((activity) => {
          const advancedMarker = document.createElement('gmp-advanced-marker') as HTMLElement;
          advancedMarker.setAttribute('position', `${activity.lat},${activity.lng}`);
          advancedMarker.setAttribute('title', activity.name);
          
          // 創建標記內容
          const pinElement = new PinElement({
            background: getMarkerColorByType(activity.type),
            borderColor: '#FFFFFF',
            glyphColor: '#FFFFFF',
            scale: 1.2,
            glyph: activity.order.toString(),
          });
          
          // 設置標記內容
          (advancedMarker as any).content = pinElement.element;
          
          // 設置碰撞行為
          (advancedMarker as any).collisionBehavior = window.google.maps.CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL;
          
          // 添加標記到地圖
          mapElement.appendChild(advancedMarker);
          markersRef.current.push(advancedMarker);
        });
        
        // 儲存活動位置映射，用於快速查找接近點擊位置的標記
        const activityLocations = validActivities.reduce((map, activity, index) => {
          map[`${activity.lat},${activity.lng}`] = { activity, index };
          return map;
        }, {} as Record<string, { activity: Activity, index: number }>);

        // 添加點擊事件 - 整合官方示例和自定義行為
        map.addListener('click', async (event: any) => {
          // 如果點擊的是地圖空白處且不是 POI，則關閉詳情
          if (!event.placeId) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            
            // 檢查是否點擊接近我們的標記
            let foundNearbyMarker = false;
            
            // 找到最近的標記（如果在可接受範圍內）
            for (let i = 0; i < validActivities.length; i++) {
              const activity = validActivities[i];
              // 檢查距離是否在閾值內（約 50 米）
              const distance = Math.sqrt(
                Math.pow(activity.lat - lat, 2) + 
                Math.pow(activity.lng - lng, 2)
              );
              
              // 如果足夠接近，顯示該標記的詳情
              if (distance < 0.0005) { // 大約 50 米的經緯度差
                foundNearbyMarker = true;
                break;
              }
            }
            
            // 如果不接近任何標記，關閉詳情
            if (!foundNearbyMarker) {
              setShowDetails(false);
              if (detailsContainerRef.current) {
                detailsContainerRef.current.style.display = 'none';
              }
              if (tempMarkerRef.current) {
                tempMarkerRef.current.style.display = 'none';
              }
              return; // 直接返回，不執行後續代碼
            }
          }
          
          // 清除臨時標記位置
          if (tempMarkerRef.current) {
            (tempMarkerRef.current as any).position = null;
          }
          
          // 停止事件傳播
          if (event.stop) {
            event.stop();
          }
          
          try {
            // 顯示詳情容器
            if (detailsContainerRef.current) {
              detailsContainerRef.current.style.display = 'block';
            }
            setShowDetails(true);
            
            // 檢查是否點擊了 POI
            if (event.placeId) {
              // 顯示 POI 詳情
              await (placeDetailsElement as any).configureFromPlace({ id: event.placeId });
              
              // 獲取地點並顯示標記
              const place = (placeDetailsElement as any).place;
              if (place && place.location) {
                // 調整地圖視圖
                const adjustedCenter = offsetLatLngRight(place.location, -0.005);
                
                // 顯示標記
                if (tempMarkerRef.current) {
                  (tempMarkerRef.current as any).position = place.location;
                  tempMarkerRef.current.style.display = 'block';
                }
                
                map.panTo(adjustedCenter);
                map.setZoom(16);
              }
            } else {
              // 點擊了地圖上的其他位置
              const lat = event.latLng.lat();
              const lng = event.latLng.lng();
              
              // 檢查是否點擊接近我們的標記
              let foundNearbyMarker = false;
              
              // 找到最近的標記（如果在可接受範圍內）
              for (let i = 0; i < validActivities.length; i++) {
                const activity = validActivities[i];
                // 檢查距離是否在閾值內（約 50 米）
                const distance = Math.sqrt(
                  Math.pow(activity.lat - lat, 2) + 
                  Math.pow(activity.lng - lng, 2)
                );
                
                // 如果足夠接近，顯示該標記的詳情
                if (distance < 0.0005) { // 大約 50 米的經緯度差
                  foundNearbyMarker = true;
                  const latLng = new window.google.maps.LatLng(activity.lat, activity.lng);
                  
                  // 配置詳情
                  await (placeDetailsElement as any).configureFromLocation(latLng);
                  
                  // 顯示標記
                  if (tempMarkerRef.current) {
                    (tempMarkerRef.current as any).position = latLng;
                    tempMarkerRef.current.style.display = 'block';
                  }
                  
                  // 調整地圖視圖
                  const adjustedCenter = offsetLatLngRight(latLng, -0.005);
                  map.panTo(adjustedCenter);
                  map.setZoom(16);
                  break;
                }
              }
              
              // 如果不接近任何標記，則顯示點擊位置的詳情
              if (!foundNearbyMarker) {
                await (placeDetailsElement as any).configureFromLocation(event.latLng);
                
                // 獲取地點並顯示標記
                const place = (placeDetailsElement as any).place;
                if (place && place.location) {
                  // 調整地圖視圖
                  const adjustedCenter = offsetLatLngRight(place.location, -0.005);
                  
                  // 顯示標記
                  if (tempMarkerRef.current) {
                    (tempMarkerRef.current as any).position = place.location;
                    tempMarkerRef.current.style.display = 'block';
                  }
                  
                  map.panTo(adjustedCenter);
                  map.setZoom(16);
                }
              }
            }
          } catch (error) {
            console.error('無法顯示地點詳情:', error);
          }
        });
        
        // 為活動標記添加點擊事件 - 使用自定義名稱增強詳情
        markersRef.current.forEach((marker, index) => {
          if (index < validActivities.length) {
            const activity = validActivities[index];
            
            marker.addEventListener('gmp-click', async () => {
              // 顯示詳情容器
              if (detailsContainerRef.current) {
                detailsContainerRef.current.style.display = 'block';
              }
              setShowDetails(true);
              
              // 創建位置對象
              const latLng = new window.google.maps.LatLng(activity.lat, activity.lng);
              
              try {
                // 嘗試使用 Places API 查詢更豐富的信息 - 使用 findPlaceFromQuery 更精確
                try {
                  const placesService = new window.google.maps.places.PlacesService(map);
                  
                  // 使用更豐富的搜索方式，但只使用官方支持的欄位
                  placesService.findPlaceFromQuery({
                    query: activity.name,
                    fields: [
                      'place_id', 'name', 'formatted_address', 'geometry', 
                      'photos', 'rating', 'user_ratings_total', 'types'
                    ],
                    locationBias: { 
                      center: latLng, 
                      radius: 300 // 搜索半徑更大
                    }
                  }, async (results, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                      // 使用 place_id 配置詳情 - 這是推薦的方式
                      const placeId = results[0].place_id;
                      
                      if (placeId) {
                        // 首先嘗試設置 place 屬性
                        placeDetailsElement.setAttribute('place', placeId);
                        
                        // 然後使用配置方法作為備份
                        try {
                          // 使用 getDetails 獲取完整信息，只使用支持的欄位
                          placesService.getDetails(
                            { 
                              placeId: placeId,
                              fields: [
                                'place_id', 'name', 'formatted_address', 'geometry', 
                                'photos', 'rating', 'user_ratings_total', 'opening_hours',
                                'price_level', 'types', 'vicinity'
                              ]
                            }, 
                            async (place, detailStatus) => {
                              if (detailStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                                // 使用原始的簡單配置方法
                                await (placeDetailsElement as any).configureFromPlace({ 
                                  id: place.place_id 
                                });
                              } else {
                                // 如果詳情請求失敗，退回到簡單的使用 ID
                                await (placeDetailsElement as any).configureFromPlace({ id: placeId });
                              }
                            }
                          );
                        } catch (configError) {
                          console.warn('詳細配置方法失敗，使用簡單 ID:', configError);
                          await (placeDetailsElement as any).configureFromPlace({ id: placeId });
                        }
                      } else {
                        // 如果沒有 place_id，退回到位置方式
                        await (placeDetailsElement as any).configureFromLocation(latLng);
                      }
                    } else {
                      // 找不到匹配地點，嘗試 textSearch 作為備選方案
                      placesService.textSearch({
                        query: activity.name,
                        location: latLng,
                        radius: 300  // 增大搜索半徑
                      }, async (textResults, textStatus) => {
                        if (textStatus === window.google.maps.places.PlacesServiceStatus.OK && 
                            textResults && textResults.length > 0 && 
                            textResults[0].place_id) {
                          // 使用文本搜索找到的地點 ID
                          await (placeDetailsElement as any).configureFromPlace({ id: textResults[0].place_id });
                        } else {
                          // 如果所有 API 請求都失敗，退回到位置方式
                          await (placeDetailsElement as any).configureFromLocation(latLng);
                        }
                      });
                    }
                    
                    // 顯示標記和調整地圖視圖
                    if (tempMarkerRef.current) {
                      (tempMarkerRef.current as any).position = latLng;
                      tempMarkerRef.current.style.display = 'block';
                    }
                    
                    const adjustedCenter = offsetLatLngRight(latLng, -0.005);
                    map.panTo(adjustedCenter);
                    map.setZoom(16);
                  });
                } catch (error) {
                  // Places API 可能不可用，退回到直接使用位置
                  console.warn('Places API 調用失敗，使用位置顯示:', error);
                  await (placeDetailsElement as any).configureFromLocation(latLng);
                  
                  // 顯示標記
                  if (tempMarkerRef.current) {
                    (tempMarkerRef.current as any).position = latLng;
                    tempMarkerRef.current.style.display = 'block';
                  }
                  
                  // 調整地圖視圖
                  const adjustedCenter = offsetLatLngRight(latLng, -0.005);
                  map.panTo(adjustedCenter);
                  map.setZoom(16);
                }
              } catch (error) {
                console.error('無法顯示標記詳情:', error);
              }
            });
          }
        });
        
        // 如果有活動，初始顯示第一個活動的詳情，並立即聚焦
        if (validActivities.length > 0) {
          try {
            const firstActivity = validActivities[0];
            const latLng = new window.google.maps.LatLng(firstActivity.lat, firstActivity.lng);
            
            // 嘗試使用 Places API 查詢更豐富的信息
            try {
              const placesService = new window.google.maps.places.PlacesService(map);
              placesService.findPlaceFromQuery({
                query: firstActivity.name,
                fields: [
                  'place_id', 'name', 'formatted_address', 'geometry', 
                  'photos', 'rating', 'user_ratings_total', 'types'
                ],
                locationBias: { 
                  center: latLng, 
                  radius: 300 
                }
              }, async (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && 
                    results && results.length > 0 && 
                    results[0].place_id) {
                  // 使用 place_id 配置詳情
                  await (placeDetailsElement as any).configureFromPlace({ id: results[0].place_id });
                  
                  // 顯示詳情容器
                  if (detailsContainerRef.current) {
                    detailsContainerRef.current.style.display = 'block';
                  }
                  setShowDetails(true);
                } else {
                  // 找不到匹配地點，使用位置
                  await (placeDetailsElement as any).configureFromLocation(latLng);
                  
                  // 顯示詳情容器
                  if (detailsContainerRef.current) {
                    detailsContainerRef.current.style.display = 'block';
                  }
                  setShowDetails(true);
                }
                
                // 顯示標記
                if (tempMarkerRef.current) {
                  (tempMarkerRef.current as any).position = latLng;
                  tempMarkerRef.current.style.display = 'block';
                }
                
                // 直接定位到第一個活動點的位置，無需偏移
                map.panTo(latLng);
                map.setZoom(16); // 使用較高的縮放級別以便清楚看到
              });
            } catch (error) {
              // Places API 可能不可用，退回到直接使用位置
              console.warn('Places API 調用失敗，使用位置顯示初始詳情:', error);
              await (placeDetailsElement as any).configureFromLocation(latLng);
              
              // 顯示詳情容器
              if (detailsContainerRef.current) {
                detailsContainerRef.current.style.display = 'block';
              }
              setShowDetails(true);
              
              // 顯示標記
              if (tempMarkerRef.current) {
                (tempMarkerRef.current as any).position = latLng;
                tempMarkerRef.current.style.display = 'block';
              }
              
              // 直接定位到第一個活動點的位置
              map.panTo(latLng);
              map.setZoom(16);
            }
          } catch (error) {
            console.error('無法顯示初始詳情:', error);
          }
        }
        
        setMapLoaded(true);
      } catch (error) {
        console.error('Google Maps 初始化失敗:', error);
      }
    };

    // 如果活動列表改變但不為空，且地圖尚未載入，則載入地圖
    if (validActivities.length > 0 && !mapLoaded) {
      loadGoogleMapsApi();
    }

    // 清理函數
    return () => {
      // 移除事件監聽器
      eventListenersRef.current.forEach(listener => {
        if (listener && typeof listener.remove === 'function') {
          listener.remove();
        }
      });
      eventListenersRef.current = [];
    };
  }, [validActivities, mapLoaded]);

  // 組件卸載時的清理
  useEffect(() => {
    return () => {
      // 移除事件監聽器
      eventListenersRef.current.forEach(listener => {
        if (listener && typeof listener.remove === 'function') {
          listener.remove();
        }
      });
      eventListenersRef.current = [];
      
      // 清理 DOM 元素
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = '';
      }
      
      // 清理標記引用
      markersRef.current = [];
      tempMarkerRef.current = null;
      
      // 移除地圖元素引用
      mapElementRef.current = null;
      
      // 移除地點詳情元素引用
      placeDetailsElementRef.current = null;
      
      // 注意：我們不移除全局腳本，因為其他地方可能仍需要它
      // 但我們將設置載入狀態標記為 false，以便在需要時可以重新初始化
      // googleMapsApiLoaded = false;
    };
  }, []);

  // 監聽 ESC 鍵關閉詳情面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDetails) {
        setShowDetails(false);
        if (detailsContainerRef.current) {
          detailsContainerRef.current.style.display = 'none';
        }
        if (tempMarkerRef.current) {
          tempMarkerRef.current.style.display = 'none';
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDetails]);

  // 監聽 showDetails 狀態變化
  useEffect(() => {
    if (detailsContainerRef.current) {
      detailsContainerRef.current.style.display = showDetails ? 'block' : 'none';
    }
  }, [showDetails]);

  return (
    <div 
      className="relative w-full h-full rounded-lg overflow-hidden"
      onClick={(e) => {
        // 設置全局點擊標記
        (window as any).__mapClickHandled = true;
        e.stopPropagation();
      }} 
    >
      <div ref={mapContainerRef} className="w-full h-full"></div>
    </div>
  );
};

export default PlanMap;
