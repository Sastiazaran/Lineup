"use client";

import { useCallback, useRef } from "react";

type RangeSliderProps = {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
  label?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, min: number, max: number, step: number): number {
  const snapped = Math.round((value - min) / step) * step + min;
  return clamp(snapped, min, max);
}

export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (v) => String(v),
  label,
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [low, high] = value;

  const lowPercent = ((low - min) / (max - min)) * 100;
  const highPercent = ((high - min) / (max - min)) * 100;

  const updateFromPointer = useCallback(
    (clientX: number, thumb: "low" | "high") => {
      const track = trackRef.current;
      if (!track) {
        return;
      }
      const rect = track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const raw = min + ratio * (max - min);
      const next = snap(raw, min, max, step);

      if (thumb === "low") {
        onChange([Math.min(next, high), high]);
      } else {
        onChange([low, Math.max(next, low)]);
      }
    },
    [high, low, max, min, onChange, step],
  );

  function startDrag(thumb: "low" | "high") {
    return (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        updateFromPointer(moveEvent.clientX, thumb);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-mist">{label}</span>
          <span className="font-medium text-lime">
            {formatValue(low)} – {formatValue(high)}
          </span>
        </div>
      ) : null}
      <div ref={trackRef} className="relative h-6">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/15" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-lime/70"
          style={{ left: `${lowPercent}%`, width: `${highPercent - lowPercent}%` }}
        />
        <button
          type="button"
          aria-label="Minimum value"
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-field-deep bg-lime shadow-md"
          style={{ left: `${lowPercent}%` }}
          onPointerDown={startDrag("low")}
        />
        <button
          type="button"
          aria-label="Maximum value"
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-field-deep bg-lime shadow-md"
          style={{ left: `${highPercent}%` }}
          onPointerDown={startDrag("high")}
        />
      </div>
    </div>
  );
}
