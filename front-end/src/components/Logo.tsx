import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
  className?: string;
}

const Logo = ({ size = 'md', withText = true, className = '' }: LogoProps) => {
  // 根據尺寸設置不同的類
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10'
  };

  return (
    <Link to="/" className={`flex items-center ${className}`}>
      <div className="flex items-center">
        {/* Logo 圖標 */}
        <div className={`${sizeClasses[size]} flex items-center justify-center`}>
          <svg
            className="h-full"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 5L5 20L20 35L35 20L20 5Z"
              fill="#3B82F6"
              stroke="#2563EB"
              strokeWidth="2"
            />
            <circle cx="20" cy="20" r="6" fill="white" />
            <path
              d="M24 17L16 23M16 17L24 23"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        {/* Logo 文字（若 withText 為 true 則顯示） */}
        {withText && (
          <span className={`ml-2 font-bold text-blue-600 ${size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-2xl'}`}>
            TRAVO
          </span>
        )}
      </div>
    </Link>
  );
};

export default Logo; 