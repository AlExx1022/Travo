import React from 'react';

interface TimelineConnectorProps {
  durationMinutes: number;
  isLast?: boolean;
}

const TimelineConnector: React.FC<TimelineConnectorProps> = ({ 
  durationMinutes,
  isLast = false
}) => {
  // 確保 durationMinutes 是有效的數值
  const safeDuration = typeof durationMinutes === 'number' && durationMinutes > 0 
    ? durationMinutes 
    : 60; // 使用預設值60分鐘
  
  // 根據活動持續時間計算線的高度，使用比例尺縮放
  // 例如：每10分鐘=5px高度，可以根據實際需求調整
  const calculateHeight = (minutes: number): string => {
    // 最小高度為30px，確保即使持續時間很短，也有合理的視覺呈現
    const minHeight = 30;
    // 比例因子：每分鐘0.5px
    const factor = 0.5;
    
    const calculatedHeight = Math.max(minHeight, minutes * factor);
    return `${calculatedHeight}px`;
  };
  
  // 如果是最後一個活動，不顯示連接線
  if (isLast) {
    return null;
  }
  
  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex flex-col items-center">
        {/* 垂直線 */}
        <div 
          className="w-0.5 bg-blue-200" 
          style={{ height: calculateHeight(safeDuration) }}
        ></div>
        
        {/* 持續時間提示 */}
        {safeDuration > 0 && (
          <div className="mt-1 px-2 py-0.5 bg-blue-50 rounded-full text-xs text-blue-600 font-medium">
            {safeDuration >= 60 
              ? `${Math.floor(safeDuration / 60)}小時${safeDuration % 60 > 0 ? ` ${safeDuration % 60}分鐘` : ''}`
              : `${safeDuration}分鐘`
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineConnector; 