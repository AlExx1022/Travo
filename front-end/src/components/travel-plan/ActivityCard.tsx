import React from 'react';
import RatingDisplay from './RatingDisplay';
import ImageCarousel from './ImageCarousel';

interface ActivityCardProps {
  name: string;
  time: string;
  duration_minutes: number;
  type: string;
  description: string;
  photos: string[];
  rating?: number;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  name,
  time,
  duration_minutes,
  type,
  description,
  photos = [], // 預設為空數組
  rating
}) => {
  // 檢查並安全處理輸入
  const safeName = name || '未命名活動';
  const safeTime = time || '00:00';
  const safeDuration = typeof duration_minutes === 'number' && duration_minutes > 0 ? duration_minutes : 60;
  const safeType = type || '景點';
  const safeDescription = description || '無詳細資訊';
  const safePhotos = Array.isArray(photos) ? photos : [];
  const safeRating = typeof rating === 'number' && rating >= 0 ? rating : undefined;

  // 格式化時間
  const formatTime = (timeString: string): string => {
    // 如果時間格式已經是 "HH:MM"，則直接返回
    if (/^\d{1,2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // 否則嘗試將字符串轉換為日期對象，再格式化
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        return timeString; // 如果是無效日期，返回原始字符串
      }
      return date.toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('時間格式化錯誤:', error);
      return timeString;
    }
  };
  
  // 確定活動類型的圖標和顏色
  const getTypeInfo = (activityType: string) => {
    const types: Record<string, {icon: string, bgColor: string, textColor: string}> = {
      '景點': {
        icon: '🏞️',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      },
      '餐廳': {
        icon: '🍽️',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800'
      },
      '購物': {
        icon: '🛍️',
        bgColor: 'bg-pink-100',
        textColor: 'text-pink-800'
      },
      '住宿': {
        icon: '🏨',
        bgColor: 'bg-indigo-100',
        textColor: 'text-indigo-800'
      },
      '交通': {
        icon: '🚌',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      },
      '活動': {
        icon: '🎭',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800'
      }
    };
    
    // 如果找不到類型，返回默認值
    return types[activityType] || {
      icon: '📍',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800'
    };
  };
  
  const typeInfo = getTypeInfo(safeType);
  const formattedTime = formatTime(safeTime);
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* 活動頭部：時間、名稱和類型 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          {/* 時間 */}
          <div className="flex flex-col items-center justify-center bg-gray-100 rounded-lg p-2 w-16 h-16">
            <span className="text-lg font-bold text-gray-800">{formattedTime}</span>
            <span className="text-xs text-gray-500">
              {safeDuration >= 60 
                ? `${Math.floor(safeDuration / 60)}小時${safeDuration % 60 > 0 ? ` ${safeDuration % 60}分` : ''}`
                : `${safeDuration}分鐘`
              }
            </span>
          </div>
          
          {/* 名稱 */}
          <div>
            <h3 className="font-medium text-lg text-gray-900">{safeName}</h3>
            {safeRating !== undefined && (
              <div className="mt-1">
                <RatingDisplay rating={safeRating} />
              </div>
            )}
          </div>
        </div>
        
        {/* 類型標籤 */}
        <div className={`flex items-center px-3 py-1 rounded-full ${typeInfo.bgColor} ${typeInfo.textColor}`}>
          <span className="mr-1">{typeInfo.icon}</span>
          <span className="text-sm font-medium">{safeType}</span>
        </div>
      </div>
      
      {/* 圖片輪播 */}
      <div className="w-full">
        <ImageCarousel images={safePhotos} height="h-48" />
      </div>
      
      {/* 活動描述 */}
      <div className="p-4">
        <p className="text-gray-600 text-sm leading-relaxed">{safeDescription}</p>
      </div>
    </div>
  );
};

export default ActivityCard; 