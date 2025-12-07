import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: ReactNode;
  children?: ReactNode;
  showIcon?: boolean;
}

export function Tooltip({ content, children, showIcon = true }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      {children}
      <div
        className="inline-flex items-center ml-1 cursor-help"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {showIcon && <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />}
        {isVisible && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg whitespace-normal min-w-[200px] max-w-[300px]">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
          </div>
        )}
      </div>
    </div>
  );
}
