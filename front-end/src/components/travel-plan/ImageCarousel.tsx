import React, { useState, useEffect } from 'react';

interface ImageCarouselProps {
  images: string[];
  interval?: number; // 自動輪播間隔，毫秒
  showIndicators?: boolean;
  showControls?: boolean;
  height?: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  interval = 5000,
  showIndicators = true,
  showControls = true,
  height = 'h-64'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // 自動輪播
  useEffect(() => {
    if (!isPlaying || images.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [currentIndex, images.length, interval, isPlaying]);
  
  // 前往下一張圖片
  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };
  
  // 前往上一張圖片
  const goToPrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };
  
  // 直接前往特定圖片
  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };
  
  // 暫停/播放自動輪播
  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };
  
  // 處理滑鼠懸停
  const handleMouseEnter = () => {
    setIsPlaying(false);
  };
  
  const handleMouseLeave = () => {
    setIsPlaying(true);
  };
  
  // 如果沒有圖片，顯示預設圖片
  if (!images || images.length === 0) {
    return (
      <div className={`relative overflow-hidden rounded-lg ${height} bg-gray-200 flex items-center justify-center`}>
        <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  
  // 如果只有一張圖片，不需要輪播功能
  if (images.length === 1) {
    return (
      <div className={`relative overflow-hidden rounded-lg ${height}`}>
        <img 
          src={images[0]} 
          alt="圖片" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  
  return (
    <div 
      className={`relative overflow-hidden rounded-lg ${height}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 圖片容器 */}
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <div 
            key={index} 
            className={`absolute w-full h-full transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img 
              src={image} 
              alt={`圖片 ${index + 1}`} 
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      
      {/* 左右控制按鈕 */}
      {showControls && images.length > 1 && (
        <>
          <button 
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/60 hover:bg-white/80 rounded-full p-1 shadow-md z-20"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/60 hover:bg-white/80 rounded-full p-1 shadow-md z-20"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
      
      {/* 指示器 */}
      {showIndicators && images.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2 z-20">
          {images.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
              onClick={() => goToImage(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel; 