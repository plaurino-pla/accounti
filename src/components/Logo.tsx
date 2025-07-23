import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  color?: 'white' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showTagline = true, 
  className = '',
  color = 'white'
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const taglineSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const textColor = color === 'white' ? 'text-white' : 'text-gray-900';
  const taglineColor = color === 'white' ? 'text-white/80' : 'text-gray-600';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`font-bold ${textColor} ${sizeClasses[size]} tracking-tight`}>
        <span className="text-3xl md:text-4xl lg:text-5xl">a</span>
        <span className="ml-1">ccounti</span>
      </div>
      {showTagline && (
        <div className={`${taglineColor} ${taglineSizeClasses[size]} font-medium tracking-wide mt-1`}>
          AI Invoice Management
        </div>
      )}
    </div>
  );
};

export default Logo; 