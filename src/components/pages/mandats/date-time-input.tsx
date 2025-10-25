"use client";

import React, { useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlCalender } from "react-icons/sl";

interface DateTimeInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
}

export function DateTimeInput({
  value,
  onChange,
  className,
  placeholder = "Sélectionnez la date de départ souhaitée",
}: DateTimeInputProps) {
  const selectedDate = value ? new Date(value) : null;
  const datepickerRef = useRef<DatePicker>(null);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Left icon */}
      <SlCalender
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A7282] w-4 h-4 cursor-pointer z-10"
        onClick={() => datepickerRef.current?.setOpen(true)}
      />

      {/* DatePicker input */}
      <DatePicker
        ref={datepickerRef}
        selected={selectedDate}
        onChange={(date: Date | null) => {
          onChange({
            target: { value: date ? date.toISOString().split("T")[0] : "" },
          } as React.ChangeEvent<HTMLInputElement>);
        }}
        minDate={new Date()}
        placeholderText={placeholder}
        className={cn(
          "w-full h-11 rounded-lg border border-transparent bg-[#F9FAFB] pl-10 pr-3 text-[#6A7282]",
          "focus:outline-none focus:ring-2 focus:ring-[#D1D5DB] transition-all duration-200",
          "relative z-0"
        )}
        dateFormat="yyyy-MM-dd"
      />

      {/* Optional: hide default react-datepicker triangle */}
      <style jsx>{`
        .react-datepicker__triangle {
          display: none;
        }
        .react-datepicker-wrapper {
          width: 100%;
        }
        .react-datepicker__input-container input {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
