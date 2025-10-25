"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"
import { FaStar } from "react-icons/fa" // example icon

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  trackHeight = "h-2",
  rangeColor = "bg-green-500",
  renderThumb, // new prop to pass custom thumb
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  trackHeight?: string
  rangeColor?: string
  renderThumb?: (index: number) => React.ReactNode
}) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
        ? defaultValue
        : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "bg-gray-300 relative grow overflow-hidden rounded-full",
          trackHeight,
          "data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1.5 data-[orientation=vertical]:h-full"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute",
            rangeColor,
            "data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>

      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="focus:outline-none"
        >
          {renderThumb ? (
            renderThumb(index) // render custom thumb
          ) : (
            <div className="w-6 h-6 bg-white border-2 border-primary rounded-full shadow-md" />
          )}
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
