"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DateTimeInput({
  value,
  onChange,
  className,
}: DateTimeInputProps) {
  /**
   * Formate la date pour l'affichage
   */
  const formatDisplayDate = (dateTimeString: string): string => {
    if (!dateTimeString) return "";

    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString("fr-CH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Zurich", // UTC+2 (heure d'été)
      });
    } catch {
      return dateTimeString;
    }
  };

  /**
   * Gère le changement direct de la valeur datetime-local
   */
  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Input principal datetime-local */}
      <div className="relative">
        {/* Icon on the left */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
        </div>

        {/* Input with left padding to make space for the icon */}
        <Input
          type="datetime-local"
          value={value}
          onChange={handleDateTimeChange}
          className="pl-10" // space for icon
          min={new Date().toISOString().slice(0, 16)}
          placeholder="Select date and time"
        />
      </div>

      {/* Affichage formaté */}
      {value && (
        <div className="text-sm text-muted-foreground">
          Heure souhaitée : {formatDisplayDate(value)}
        </div>
      )}
    </div>
  );
}
