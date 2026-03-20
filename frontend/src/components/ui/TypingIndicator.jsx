import React from 'react';

const TypingIndicator = ({ className = '', ...props }) => {
  return (
    <div 
      className={`flex space-x-1 items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-4 py-2 w-fit ${className}`}
      {...props}
    >
      <div className="typing-dot w-2 h-2 bg-[var(--color-primary)] rounded-full" />
      <div className="typing-dot w-2 h-2 bg-[var(--color-primary)] rounded-full" />
      <div className="typing-dot w-2 h-2 bg-[var(--color-primary)] rounded-full" />
    </div>
  );
};

export default TypingIndicator;
