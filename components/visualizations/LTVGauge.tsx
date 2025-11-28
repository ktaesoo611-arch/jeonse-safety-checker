'use client';

import { useEffect, useRef } from 'react';

interface LTVGaugeProps {
  ltv: number; // 0-100+ percentage
  className?: string;
}

/**
 * LTV (Loan-to-Value) Gauge Visualization
 * Shows the debt ratio as a circular gauge with color-coded risk levels
 */
export function LTVGauge({ ltv, className = '' }: LTVGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const scale = window.devicePixelRatio || 1;
    const size = 300;
    canvas.width = size * scale;
    canvas.height = size * scale;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(scale, scale);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 110;
    const lineWidth = 28;

    // Draw background arc (light gray)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Calculate LTV angle (0% to 100%+, capped at 120% for display)
    const cappedLTV = Math.min(ltv, 120);
    const ltvAngle = 0.75 * Math.PI + (cappedLTV / 100) * 1.5 * Math.PI;

    // Determine color based on LTV thresholds
    let gradient;
    if (ltv < 50) {
      // Excellent: Green
      gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(1, '#14b8a6');
    } else if (ltv < 60) {
      // Good: Light green to yellow
      gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      gradient.addColorStop(0, '#84cc16');
      gradient.addColorStop(1, '#eab308');
    } else if (ltv < 70) {
      // Acceptable: Yellow to orange
      gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      gradient.addColorStop(0, '#eab308');
      gradient.addColorStop(1, '#f97316');
    } else if (ltv < 80) {
      // Risky: Orange to red
      gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      gradient.addColorStop(0, '#f97316');
      gradient.addColorStop(1, '#ef4444');
    } else {
      // Critical: Red to dark red
      gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#dc2626');
    }

    // Draw LTV arc with animation effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0.75 * Math.PI, ltvAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw center circle background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - lineWidth / 2 - 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Draw LTV percentage text
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${ltv.toFixed(1)}%`, centerX, centerY - 8);

    // Draw "LTV Ratio" label
    ctx.fillStyle = '#6b7280';
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('LTV Ratio', centerX, centerY + 28);

    // Draw threshold markers
    const thresholds = [
      { value: 0, label: '0%', angle: 0.75 * Math.PI },
      { value: 50, label: '50%', angle: 0.75 * Math.PI + 0.75 * Math.PI },
      { value: 100, label: '100%', angle: 2.25 * Math.PI }
    ];

    thresholds.forEach(({ label, angle }) => {
      const markerX = centerX + (radius + lineWidth / 2 + 12) * Math.cos(angle);
      const markerY = centerY + (radius + lineWidth / 2 + 12) * Math.sin(angle);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, markerX, markerY);
    });
  }, [ltv]);

  const getRiskLevel = (ltv: number) => {
    if (ltv < 50) return { level: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (ltv < 60) return { level: 'Good', color: 'text-green-600', bg: 'bg-green-50' };
    if (ltv < 70) return { level: 'Acceptable', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (ltv < 80) return { level: 'Risky', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { level: 'Critical', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const risk = getRiskLevel(ltv);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <canvas ref={canvasRef} className="mb-6" />

      <div className={`inline-flex items-center px-6 py-3 rounded-full font-bold text-lg ${risk.bg} ${risk.color} border-2 border-current/20`}>
        {risk.level}
      </div>

      {/* Risk level descriptions */}
      <div className="mt-6 w-full max-w-md text-sm text-gray-600 space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-medium">Excellent (&lt;50%)</span>
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium">Good (50-60%)</span>
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-yellow-400" />
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium">Acceptable (60-70%)</span>
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-400" />
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium">Risky (70-80%)</span>
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-500 to-red-500" />
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium">Critical (&gt;80%)</span>
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-red-600" />
        </div>
      </div>
    </div>
  );
}
