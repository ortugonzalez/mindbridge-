import React from 'react';

const Avatar = ({ src = '/soledad_avatar.png', alt = 'Soledad', size = 'md', className = '', ...props }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div 
      className={`relative inline-block rounded-full overflow-hidden border-2 border-[var(--color-primary)] shadow-md ${sizes[size]} ${className}`}
      {...props}
    >
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-0 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" title="Online" />
    </div>
  );
};

export default Avatar;
