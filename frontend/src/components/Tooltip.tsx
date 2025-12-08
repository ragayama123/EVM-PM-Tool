import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: ReactNode;
  children?: ReactNode;
  showIcon?: boolean;
  position?: 'top' | 'bottom';
}

export function Tooltip({ content, children, showIcon = true, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  const arrowClasses = position === 'top'
    ? 'top-full border-t-gray-800'
    : 'bottom-full border-b-gray-800';

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
          <div className={`absolute z-50 ${positionClasses} left-1/2 -translate-x-1/2 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg whitespace-normal min-w-[200px] max-w-[300px] text-left`}>
            {content}
            <div className={`absolute ${arrowClasses} left-1/2 -translate-x-1/2 border-4 border-transparent`} />
          </div>
        )}
      </div>
    </div>
  );
}
