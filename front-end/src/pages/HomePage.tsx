import Header from '../components/Header';
import { useEffect, useState, useRef } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

// 獲取環境變數中的Google API金鑰
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// 定義Google地圖API腳本載入狀態
declare global {
  interface Window {
    google: any;
    initGoogleMapsCallback: () => void;
  }
}

// 定義15個世界著名旅遊景點
const famousPlaces = [
  { id: 1, name: '艾菲爾鐵塔', location: '巴黎，法國', searchTerm: 'Eiffel Tower, Paris, France' },
  { id: 10, name: '台北101', location: '台北，台灣', searchTerm: 'Taipei 101, Taiwan' },
  { id: 11, name: '雪梨歌劇院', location: '雪梨，澳洲', searchTerm: 'Sydney Opera House, Australia' },
  { id: 4, name: '自由女神像', location: '紐約，美國', searchTerm: 'Statue of Liberty, New York, USA' },
  { id: 5, name: '羅浮宮', location: '巴黎，法國', searchTerm: 'Louvre Museum, Paris, France' },
  { id: 6, name: '聖托里尼島', location: '聖托里尼，希臘', searchTerm: 'Santorini, Greece' },
  { id: 7, name: '馬丘比丘', location: '庫斯科，秘魯', searchTerm: 'Machu Picchu, Peru' },
  { id: 8, name: '長城', location: '北京，中國', searchTerm: 'Great Wall of China, Beijing' },
  { id: 9, name: '京都伏見稻荷大社', location: '京都，日本', searchTerm: 'Fushimi Inari Shrine, Kyoto, Japan' },
  { id: 3, name: '聖家堂', location: '巴塞隆納，西班牙', searchTerm: 'Sagrada Familia, Barcelona, Spain' },
  { id: 12, name: '大峽谷', location: '亞利桑那州，美國', searchTerm: 'Grand Canyon, Arizona, USA' },
  { id: 13, name: '科隆巨石陣', location: '倫敦，英國', searchTerm: 'Stonehenge, UK' },
  { id: 14, name: '布拉格城堡', location: '布拉格，捷克', searchTerm: 'Prague Castle, Czech Republic' },
  { id: 15, name: '威尼斯', location: '威尼斯，義大利', searchTerm: 'Venice, Italy' }
];

// 照片資料型別
interface PlaceImage {
  id: number;
  name: string;
  location: string;
  photoUrl: string;
  attribution?: string;  // 添加照片歸屬說明
}

const HomePage = () => {
  const [placeImages, setPlaceImages] = useState<PlaceImage[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const placesServiceRef = useRef<any>(null);

  // 輪播設置
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    adaptiveHeight: true,
    fade: true
  };

  // 加載 Google Maps JavaScript API
  useEffect(() => {
    // 如果已經載入，則不重複載入
    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    window.initGoogleMapsCallback = () => {
      setGoogleMapsLoaded(true);
    };

    // 創建 script 元素並載入 Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    
    document.head.appendChild(script);
    
    return () => {
      // 清理函數：移除腳本和回調
      window.initGoogleMapsCallback = () => {};
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // 使用 Google Maps API 獲取地點照片
  const getPlacePhotoUrl = async (searchTerm: string): Promise<{photoUrl: string, attribution?: string}> => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps) {
        reject(new Error('Google Maps API 未載入'));
        return;
      }

      // 初始化Places服務，如果尚未初始化
      if (!placesServiceRef.current) {
        // 需要一個DOM元素來初始化服務，但我們不會真的顯示地圖
        const mapDiv = document.createElement('div');
        const map = new window.google.maps.Map(mapDiv, {
          center: { lat: 0, lng: 0 },
          zoom: 2
        });
        placesServiceRef.current = new window.google.maps.places.PlacesService(map);
      }

      // 使用Places服務的findPlaceFromQuery方法搜索地點
      placesServiceRef.current.findPlaceFromQuery(
        {
          query: searchTerm,
          fields: ['name', 'photos', 'formatted_address']
        },
        (results: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const place = results[0];
            
            if (place.photos && place.photos.length > 0) {
              const photo = place.photos[0];
              const photoUrl = photo.getUrl({ maxWidth: 800, maxHeight: 600 });
              const attribution = photo.html_attributions?.[0] || '';
              
              resolve({ photoUrl, attribution });
            } else {
              // 沒有照片，使用靜態地圖作為替代
              const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(searchTerm)}&zoom=14&size=800x600&maptype=roadmap&markers=color:red%7C${encodeURIComponent(searchTerm)}&key=${GOOGLE_API_KEY}`;
              resolve({ photoUrl: staticMapUrl });
            }
          } else {
            console.error('找不到地點或搜索錯誤:', status);
            // 沒有找到地點，使用靜態地圖
            const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(searchTerm)}&zoom=14&size=800x600&maptype=roadmap&markers=color:red%7C${encodeURIComponent(searchTerm)}&key=${GOOGLE_API_KEY}`;
            resolve({ photoUrl: staticMapUrl });
          }
        }
      );
    });
  };

  // 當Google Maps API載入完成後，加載所有景點照片
  useEffect(() => {
    const loadPlaceImages = async () => {
      if (!googleMapsLoaded) return;

      setLoading(true);
      
      try {
        // 針對每個地點獲取照片
        const imagesPromises = famousPlaces.map(async (place) => {
          try {
            const { photoUrl, attribution } = await getPlacePhotoUrl(place.searchTerm);
            
            return {
              id: place.id,
              name: place.name,
              location: place.location,
              photoUrl,
              attribution
            };
          } catch (error) {
            console.error(`獲取地點照片失敗: ${place.searchTerm}`, error);
            // 單個地點錯誤時使用備用圖片
            return {
              id: place.id,
              name: place.name,
              location: place.location,
              photoUrl: `https://via.placeholder.com/800x600?text=${encodeURIComponent(place.name)}`
            };
          }
        });
        
        const images = await Promise.all(imagesPromises);
        setPlaceImages(images);
        setImagesLoaded(true);
      } catch (error) {
        console.error('無法加載景點照片', error);
        
        // 如果API調用失敗，使用備用圖片
        const fallbackImages = famousPlaces.map(place => ({
          id: place.id,
          name: place.name,
          location: place.location,
          photoUrl: `https://via.placeholder.com/800x600?text=${encodeURIComponent(place.name)}`
        }));
        
        setPlaceImages(fallbackImages);
        setImagesLoaded(true);
      } finally {
        setLoading(false);
      }
    };
    
    loadPlaceImages();
  }, [googleMapsLoaded]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* 英雄區域 */}
        <div className="relative bg-gradient-to-r from-blue-800 to-indigo-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
              <div>
                <h1 className="text-4xl font-extrabold sm:text-5xl sm:tracking-tight mb-4">
                  探索您的下一次旅行
                </h1>
                <p className="text-lg max-w-lg">
                  TRAVO 幫助您規劃完美旅行，從著名景點到隱藏寶藏，我們提供智能推薦和個性化行程。
                </p>
                <div className="mt-8 flex flex-col sm:flex-row">
                  <a
                    href="/build"
                    className="btn-primary text-center mb-3 sm:mb-0 sm:mr-3"
                  >
                    開始規劃
                  </a>
                  <a
                    href="/explore"
                    className="bg-white text-blue-800 hover:bg-gray-100 text-center font-medium py-2 px-4 rounded-md transition"
                  >
                    探索熱門目的地
                  </a>
                </div>
              </div>
              <div className="mt-12 lg:mt-0 block">
                <div className="relative mx-auto w-full max-w-md rounded-lg shadow-xl overflow-hidden">
                  {/* 輪播圖 */}
                  {imagesLoaded ? (
                    <Slider {...sliderSettings} className="places-carousel">
                      {placeImages.map((place) => (
                        <div key={place.id} className="carousel-slide">
                          <div className="relative">
                            <img 
                              src={place.photoUrl} 
                              alt={`${place.name}, ${place.location}`} 
                              className="w-full h-64 object-cover rounded-lg" 
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                              <p className="text-white font-semibold text-lg">{place.name}</p>
                              <p className="text-white/80 text-sm">{place.location}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </Slider>
                  ) : (
                    <div className="bg-gray-300 rounded-lg h-64 flex items-center justify-center">
                      <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 熱門目的地區域 */}
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">熱門目的地</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 顯示前三個熱門目的地卡片，並更新為使用 Place Photo API */}
            {placeImages.slice(0, 3).map((place) => (
              <div key={place.id} className="card destination-card">
                <div className="image-container h-48 bg-gray-300 relative">
                  <img 
                    src={place.photoUrl}
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <h3 className="text-white text-xl font-bold">{place.name}</h3>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 mb-4">探索{place.location}的著名景點{place.name}，開始您的完美旅程。</p>
                  <a href={`/explore/${place.name}`} className="text-blue-600 hover:text-blue-800 font-medium">探索{place.name} &rarr;</a>
                </div>
                {place.attribution && (
                  <div className="px-4 pb-2 text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: place.attribution }} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* 特色區 */}
        <div className="bg-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">為何選擇 TRAVO？</h2>
              <p className="mt-4 text-xl text-gray-600">我們提供智能、個性化的旅行規劃體驗</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">智能規劃</h3>
                <p className="text-gray-600">使用AI技術為您創建最佳旅行行程，節省時間和精力。</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">當地體驗</h3>
                <p className="text-gray-600">發現每個目的地的獨特體驗和隱藏景點，而不僅僅是熱門景點。</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">省時省力</h3>
                <p className="text-gray-600">不再需要花費數小時研究和計劃，我們已經為您完成了。</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-lg font-bold mb-2">TRAVO</h3>
              <p className="text-gray-400">智能旅行規劃平台</p>
            </div>
            
            <div className="md:ml-auto">
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-5 md:text-right">支援</h4>
              <ul className="space-y-2 md:text-right">
                <li><a href="#" className="text-gray-400 hover:text-white">常見問題</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">聯絡我們</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">隱私政策</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-700 text-center md:text-left">
            <p className="text-gray-400 text-sm">
              © 2025 TRAVO. 保留所有權利。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage; 