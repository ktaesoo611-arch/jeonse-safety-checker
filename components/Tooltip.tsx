'use client';

import { useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function Tooltip({ content, children, className = '' }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      {/* Trigger button - works on both hover (desktop) and click (mobile) */}
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Show more information"
      >
        {children}
      </button>

      {/* Tooltip content */}
      {isOpen && (
        <>
          {/* Backdrop for mobile - clicking outside closes tooltip */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Tooltip box */}
          <div
            className={`
              absolute z-50 w-80 md:w-96 p-4
              bg-white border border-gray-200 rounded-lg shadow-xl
              left-0 top-6
              text-xs leading-relaxed
              animate-in fade-in zoom-in-95 duration-200
              ${className}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {content}

            {/* Close button for mobile */}
            <button
              className="md:hidden absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
