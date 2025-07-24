'use client'

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { DAVCalendar } from "tsdav";
import { useEffect, useState } from "react";

interface CalendarDropdownProps {
  calendars: DAVCalendar[];
  selectedCalendar?: DAVCalendar;
  onCalendarChange?: (calendar: DAVCalendar) => void;
}

export default function CalendarDropdown({ 
  calendars, 
  selectedCalendar, 
  onCalendarChange 
}: CalendarDropdownProps) {
  const [selected, setSelected] = useState<DAVCalendar | null>(selectedCalendar || null);

  useEffect(() => {
    if (!selected && calendars.length > 0) {
      const defaultCalendar = calendars[0];
      setSelected(defaultCalendar);
      onCalendarChange?.(defaultCalendar);
    }
  }, [calendars, selected, onCalendarChange]);

  useEffect(() => {
    if (selectedCalendar) {
      setSelected(selectedCalendar);
    }
  }, [selectedCalendar]);

  const handleCalendarSelect = (calendar: DAVCalendar) => {
    setSelected(calendar);
    onCalendarChange?.(calendar);
  };

  const getDisplayName = (calendar: DAVCalendar | null): string => {
    if (!calendar?.displayName) return "Select Calendar";
    return typeof calendar.displayName === 'string' ? calendar.displayName : "Unnamed";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 p-2 h-auto">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-gray-900">
              {getDisplayName(selected)}
            </h1>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-70">
        {calendars.map((calendar) => (
          <DropdownMenuItem
            className="flex items-center gap-3 p-3"
            key={calendar.ctag}
            onClick={() => handleCalendarSelect(calendar)}
          >
            <div className="flex-1">
              <div className="font-medium">
                {getDisplayName(calendar)}
              </div>
              {selected?.url === calendar.url && (
                <div className="text-sm text-blue-600">Selected</div>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
