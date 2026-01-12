"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type DaySchedule = {
  active: boolean;
  start: string;
  end: string;
};

export type WeeklyScheduleState = Record<string, DaySchedule>;

const DAYS_CONFIG = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

export const DEFAULT_WEEKLY_SCHEDULE: WeeklyScheduleState = {
  mon: { active: true, start: "09:00", end: "18:00" },
  tue: { active: true, start: "09:00", end: "18:00" },
  wed: { active: true, start: "09:00", end: "18:00" },
  thu: { active: true, start: "09:00", end: "18:00" },
  fri: { active: true, start: "09:00", end: "18:00" },
  sat: { active: false, start: "09:00", end: "13:00" },
  sun: { active: false, start: "10:00", end: "14:00" },
};

interface WeeklyScheduleEditorProps {
  value: WeeklyScheduleState;
  onChange: (val: WeeklyScheduleState) => void;
  disabled?: boolean;
}

export function WeeklyScheduleEditor({ value, onChange, disabled }: WeeklyScheduleEditorProps) {
  const handleToggle = (day: string, active: boolean) => {
    onChange({
      ...value,
      [day]: { ...value[day], active },
    });
  };

  const handleTimeChange = (day: string, field: "start" | "end", time: string) => {
    onChange({
      ...value,
      [day]: { ...value[day], [field]: time },
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      {DAYS_CONFIG.map(({ key, label }) => {
        const schedule = value[key] || { active: false, start: "09:00", end: "18:00" };
        
        return (
          <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b sm:border-none border-slate-100 pb-3 sm:pb-0 last:border-0">
            <div className="flex items-center gap-2 w-full sm:w-32">
              <Switch
                id={`day-${key}`}
                checked={schedule.active}
                onCheckedChange={(checked) => handleToggle(key, checked)}
                disabled={disabled}
              />
              <Label htmlFor={`day-${key}`} className={cn("cursor-pointer font-medium sm:font-normal", !schedule.active && "text-slate-400 font-normal")}>
                {label}
              </Label>
            </div>

            {schedule.active ? (
              <div className="flex items-center gap-2 flex-1 justify-end sm:justify-start">
                <Input
                  type="time"
                  className="w-28 sm:w-24 h-9 sm:h-8 text-sm sm:text-xs"
                  value={schedule.start}
                  onChange={(e) => handleTimeChange(key, "start", e.target.value)}
                  disabled={disabled}
                />
                <span className="text-slate-400 text-xs">-</span>
                <Input
                  type="time"
                  className="w-28 sm:w-24 h-9 sm:h-8 text-sm sm:text-xs"
                  value={schedule.end}
                  onChange={(e) => handleTimeChange(key, "end", e.target.value)}
                  disabled={disabled}
                />
              </div>
            ) : (
              <div className="hidden sm:block flex-1 text-xs text-slate-400 italic text-right px-4">
                No atiende
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
