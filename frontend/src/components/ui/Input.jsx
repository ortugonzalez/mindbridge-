import React from 'react';

const Input = ({ className = '', ...props }) => {
  return (
    <input 
      className={`w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 ${className}`}
      {...props}
    />
  );
};

export default Input;
