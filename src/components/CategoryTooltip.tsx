"use client";

import React, { useState } from 'react';
import { getCategoryExplanation } from '@/lib/category-explanations';

interface CategoryTooltipProps {
  category: string;
}

export default function CategoryTooltip({ category }: CategoryTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const explanation = getCategoryExplanation(category);

  return (
    <span className="relative inline-block">
      <span
        className="text-gray-900 font-medium underline decoration-gray-900 decoration-1 underline-offset-2 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {category}
      </span>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-72">
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-4 relative">
            <div className="font-bold mb-2 text-sm">{category}</div>
            <div className="text-gray-200 leading-relaxed">{explanation}</div>
            {/* Seta para baixo */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="w-3 h-3 bg-gray-900 rotate-45"></div>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
