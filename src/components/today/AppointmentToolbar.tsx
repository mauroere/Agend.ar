"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, History, LayoutList } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface AppointmentToolbarProps {
  children?: React.ReactNode; // For LocationSwitcher
  currentDate?: Date;
  view: "day" | "history";
}

export function AppointmentToolbar({ children, currentDate, view }: AppointmentToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const params = new URLSearchParams(searchParams);
    params.set("date", format(date, "yyyy-MM-dd"));
    if (view === "history") {
       // If in history mode, picking a date switches to day view often, 
       // OR we just set the filter. Let's assume we switch to day view for that date
       // because 'History' implies "All list".
       params.set("view", "day");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleViewChange = (val: string) => {
     if (!val) return;
     const params = new URLSearchParams(searchParams);
     params.set("view", val);
     router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
         {children} {/* Location Switcher */}
      </div>

      <div className="flex items-center gap-2">
         {/* Date Picker - Only relevant for 'day' view usually, but good to have */}
         <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !currentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {currentDate ? (
                format(currentDate, "PPP", { locale: es })
              ) : (
                <span>Seleccionar fecha</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <ToggleGroup type="single" value={view} onValueChange={handleViewChange}>
            <ToggleGroupItem value="day" aria-label="Vista Diaria">
                <LayoutList className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="history" aria-label="Historial">
                <History className="h-4 w-4" />
            </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
