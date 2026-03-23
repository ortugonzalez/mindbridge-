import React, { useState, useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(true);

  useEffect(() => {
    // Slide up immediately on mount
    setIsVisible(true);

    const timer = setTimeout(() => {
      // Start fade out after 3 seconds
      setIsVisible(false);
      
      // Wait for animation to finish before unmounting
      setTimeout(() => {
        setIsRendered(false);
        if (onClose) onClose();
      }, 300); // 300ms matches the transition duration
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!isRendered) return null;

  const typeConfig = {
    success: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-800 dark:text-green-100',
      border: 'border-green-200 dark:border-green-800',
      icon: (
        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
        </svg>
      )
    },
    error: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-800 dark:text-red-100',
      border: 'border-red-200 dark:border-red-800',
      icon: (
        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
        </svg>
      )
    },
    info: {
      bg: 'bg-[#FAF8F5] dark:bg-[#3D4F3D]',
      text: 'text-[#2D2D2D] dark:text-[#E8EDE8]',
      border: 'border-[#7C9A7E] dark:border-[#4A5E4A]',
      icon: (
        <svg className="w-5 h-5 mr-2 text-[#7C9A7E]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
        </svg>
      )
    }
  };

  const currentConfig = typeConfig[type] || typeConfig.info;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div 
        className={`flex items-center px-4 py-3 rounded-lg shadow-lg border pointer-events-auto transform transition-all duration-300 ease-in-out
          ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border}
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      >
        {currentConfig.icon}
        <span className="font-medium text-sm">{message}</span>
      </div>
    </div>
  );
};

export default Toast;
