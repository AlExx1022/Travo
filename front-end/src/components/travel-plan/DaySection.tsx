import React from 'react';
import ActivityCard from './ActivityCard';
import TimelineConnector from './TimelineConnector';
import { v4 as uuidv4 } from 'uuid';

// 定義單個活動的介面
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

interface DaySectionProps {
  day: number;
  date: string;
  activities: Activity[];
  onDeleteActivity?: (dayIndex: number, activityId: string) => void;
  onAddActivity?: (dayIndex: number) => void;
}

const DaySection: React.FC<DaySectionProps> = ({ day, date, activities, onDeleteActivity, onAddActivity }) => {
  // 格式化日期
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    } catch (error) {
      console.error('日期格式化錯誤:', error);
      return dateString;
    }
  };
  
  const formattedDate = formatDate(date);
  
  // 確保所有活動都有 ID
  const activitiesWithIds = activities.map((activity, index) => {
    if (!activity.id) {
      // 為缺少 ID 的活動生成唯一 ID
      const generatedId = uuidv4();
      console.log(`[DaySection] 活動缺少 ID，已生成後端兼容的UUID: ${generatedId}`, activity);
      return { ...activity, id: generatedId };
    } else if (!isValidUuid(activity.id)) {
      // 如果ID不是有效的UUID，記錄但不修改它
      console.log(`[DaySection] 活動ID不是有效的UUID格式: ${activity.id}`, activity);
    }
    return activity;
  });
  
  // 按照活動時間排序
  const sortedActivities = [...activitiesWithIds].sort((a, b) => {
    // 將時間字符串轉換為分鐘數以便比較
    const timeToMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const timeA = timeToMinutes(a.time || '00:00');
    const timeB = timeToMinutes(b.time || '00:00');
    
    return timeA - timeB; // 升序排列，早的時間在前
  });
  
  console.log(`[DaySection] 第 ${day} 天的活動已按時間排序`);

  // 檢查ID是否為有效的UUID
  function isValidUuid(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
  
  // 處理刪除活動
  const handleDeleteActivity = (activityId: string | undefined, activityIndex: number) => {
    // 記錄詳細的刪除信息
    console.log(`[DaySection] 嘗試刪除活動 - 天數: ${day}, ID: ${activityId || '未定義'}, 索引: ${activityIndex}`);
    
    if (onDeleteActivity) {
      try {
        // 檢查活動ID是否為UUID格式
        const isUuidFormat = activityId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId);
        
        // 如果不是UUID格式或活動沒有ID，則使用索引格式
        let identifierToUse: string;
        
        if (!activityId || !isUuidFormat) {
          // 使用索引格式: idx-{dayIndex}-{activityIndex}
          identifierToUse = `idx-${day - 1}-${activityIndex}`;
          console.log(`[DaySection] 活動沒有有效的UUID，將使用索引格式: ${identifierToUse}`);
        } else {
          identifierToUse = activityId;
          console.log(`[DaySection] 使用活動原始UUID: ${identifierToUse}`);
        }
        
        console.log(`[DaySection] 正在調用父組件的刪除方法 - 天數: ${day-1}, ID: ${identifierToUse}`);
        onDeleteActivity(day - 1, identifierToUse); // day - 1 是因為索引從0開始
      } catch (error) {
        console.error(`[DaySection] 刪除活動時出錯:`, error);
        alert(`刪除活動時發生錯誤，請稍後再試。`);
      }
    } else {
      console.error(`[DaySection] 無法刪除活動 - 刪除方法未提供`);
      alert('無法刪除活動：刪除功能尚未實現。');
    }
  };
  
  // 檢查活動數組是否有效
  if (!Array.isArray(activities)) {
    console.error(`第 ${day} 天的活動不是有效的數組:`, activities);
    return (
      <section id={`day-${day}`} className="mb-10">
        <div className="sticky top-16 z-30 bg-gray-50 shadow-sm py-3 px-4 mb-6 rounded-lg">
          <h2 className="text-xl font-bold text-gray-800">第 {day} 天</h2>
          <p className="text-gray-600">{formattedDate}</p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg text-red-700">
          <p>活動數據無效，請檢查控制台錯誤</p>
        </div>
      </section>
    );
  }

  return (
    <section id={`day-${day}`} className="mb-10">
      {/* 日期標題 - 使用sticky可固定在視口頂部 */}
      <div className="sticky top-16 z-30 bg-gray-50 shadow-sm py-3 px-4 mb-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">第 {day} 天</h2>
            <p className="text-gray-600">{formattedDate}</p>
          </div>
          <div className="bg-blue-600 text-white rounded-full px-3 py-1 text-sm font-medium">
            {activitiesWithIds.length} 個行程
          </div>
        </div>
      </div>
      
      {/* 活動列表 */}
      <div className="pl-4">
        {activitiesWithIds.length > 0 ? (
          sortedActivities.map((activity, index) => (
            <div key={activity.id || `activity-${index}`} className="relative">
              {/* 活動卡片 */}
              <div className="mb-3 relative">
                {/* 刪除按鈕 */}
                {onDeleteActivity && (
                  <button
                    onClick={() => handleDeleteActivity(activity.id, index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center z-10 hover:bg-red-600 transition-colors"
                    title="刪除活動"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <ActivityCard
                  name={activity.name || '未命名活動'}
                  time={activity.time || '00:00'}
                  duration_minutes={activity.duration_minutes || 60}
                  type={activity.type || '景點'}
                  description={activity.description || '無詳細資訊'}
                  photos={Array.isArray(activity.photos) ? activity.photos : []}
                  rating={activity.rating}
                />
              </div>
              
              {/* 時間線連接器 */}
              {index < activitiesWithIds.length - 1 && (
                <TimelineConnector 
                  durationMinutes={activity.duration_minutes || 60} 
                  isLast={index === activitiesWithIds.length - 1}
                />
              )}
            </div>
          ))
        ) : (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <p className="text-gray-500">尚未安排行程</p>
          </div>
        )}
        
        {/* 添加活動按鈕 */}
        {onAddActivity && (
          <div className="flex justify-end mt-6">
            <button
              onClick={() => onAddActivity(day - 1)} // day - 1 是因為索引從0開始
              className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg flex items-center hover:bg-blue-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新增活動
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default DaySection; 