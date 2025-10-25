"use client";

import React, { useState, useRef } from "react";

export default function ProgressBar() {
  const [progress, setProgress] = useState(50); // Start point (50%)
  const barRef = useRef<HTMLDivElement>(null);

  // Mouse drag handler
  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setProgress(newProgress);
  };

  // Touch drag handler (for mobile)
  const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const newProgress = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setProgress(newProgress);
  };

  return (
    <div className="border border-gray-300 rounded-lg p-6 bg-gray-50 text-center select-none">
      {/* Progress bar */}
      <div
        ref={barRef}
        className="relative h-5 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
        onMouseMove={(e) => e.buttons === 1 && handleDrag(e)}
        onTouchMove={handleTouch}
      >
        {/* Green fill */}
        <div
          className="absolute left-0 top-0 h-full bg-[#45c4b0] rounded-full transition-all duration-75"
          style={{ width: `${progress}%` }}
        />

        {/* Draggable icon */}
        <div
          className="absolute z-10 bg-white rounded-full p-1 shadow-sm transition-all duration-75"
          style={{
            left: `calc(${progress}% - 8px)`,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <img
            src="/Frame.png"
            alt="arrow"
            width={16}
            height={16}
            className="object-contain"
          />
        </div>
      </div>

      {/* Text below the progress bar */}
      <p className="mt-3 text-sm text-gray-600">
        Balayez vers la droite pour signer…
      </p>
    </div>
  );
}
