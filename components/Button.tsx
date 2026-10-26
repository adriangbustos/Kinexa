import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  icon,
  className = '',
  ...props 
}) => {
  // Bevel 128px radius capsule buttons
  const baseStyles = "min-h-[44px] sm:min-h-[46px] inline-flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base tracking-tight select-none cursor-pointer";
  
  const variants = {
    // Charcoal fill, Cloud Card text
    primary: "bg-charcoal text-cloud hover:bg-black active:scale-[0.98] shadow-sm",
    // Cloud Card fill, Ink text
    secondary: "bg-cloud text-ink hover:bg-[#e2eaf5] active:scale-[0.98]",
    // Clean Paper White outline
    outline: "bg-paper text-ink border border-black/[0.08] hover:bg-cloud/50 active:scale-[0.98]",
    danger: "bg-[#DC2626] text-white hover:bg-red-700 active:scale-[0.98]"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`} 
      {...props}
    >
      {icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
