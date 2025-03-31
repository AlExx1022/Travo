import React from 'react';

interface RatingDisplayProps {
  rating: number;
  maxRating?: number;
  showNumber?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({ 
  rating, 
  maxRating = 5,
  showNumber = true,
  size = 'md'
}) => {
  // 處理 undefined 或 null 的情況
  if (rating === undefined || rating === null) {
    return <span className="text-gray-500 text-sm">無評分</span>;
  }
  
  // 確保評分在有效範圍內
  const normalizedRating = Math.max(0, Math.min(rating, maxRating));
  
  // 根據尺寸設定星星大小
  const starSizeClass = {
    'sm': 'w-4 h-4',
    'md': 'w-5 h-5',
    'lg': 'w-6 h-6'
  }[size];
  
  // 渲染個別星星
  const renderStars = () => {
    return (
      <div className="flex">
        {[...Array(maxRating)].map((_, i) => {
          // 計算每個星星的填充量 (0-1)
          const fillAmount = Math.max(0, Math.min(1, normalizedRating - i));
          
          return (
            <div key={`star-${i}`} className="relative">
              {/* 背景星星 (灰色) */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className={`${starSizeClass} text-gray-300`}
              >
                <path 
                  fillRule="evenodd" 
                  d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" 
                  clipRule="evenodd" 
                />
              </svg>
              
              {/* 前景星星 (黃色) - 只有在有填充量時才渲染 */}
              {fillAmount > 0 && (
                <div 
                  className="absolute top-0 left-0 overflow-hidden" 
                  style={{ width: `${fillAmount * 100}%` }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className={`${starSizeClass} text-yellow-400`}
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex items-center">
      {renderStars()}
      
      {showNumber && (
        <span className="ml-1 text-sm font-medium text-gray-700">
          {normalizedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default RatingDisplay; 