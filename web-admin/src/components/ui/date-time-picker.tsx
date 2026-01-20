import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({
  date,
  onDateChange,
  disabled,
  placeholder = "Pick a date and time",
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    date
  );
  const [hours, setHours] = React.useState<string>(
    date ? String(date.getHours()).padStart(2, "0") : "00"
  );
  const [minutes, setMinutes] = React.useState<string>(
    date ? String(date.getMinutes()).padStart(2, "0") : "00"
  );

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date);
      setHours(String(date.getHours()).padStart(2, "0"));
      setMinutes(String(date.getMinutes()).padStart(2, "0"));
    }
  }, [date]);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      const combinedDate = new Date(newDate);
      const hoursNum = hours !== "" ? parseInt(hours) : 0;
      const minutesNum = minutes !== "" ? parseInt(minutes) : 0;
      combinedDate.setHours(hoursNum, minutesNum, 0, 0);
      
      // Prevent selecting past date/time
      const now = new Date();
      if (combinedDate < now) {
        // If date is today but time is in the past, set to current time
        if (combinedDate.toDateString() === now.toDateString()) {
          const currentDate = new Date(now);
          setHours(String(currentDate.getHours()).padStart(2, "0"));
          setMinutes(String(currentDate.getMinutes()).padStart(2, "0"));
          setSelectedDate(currentDate);
          onDateChange(currentDate);
        } else {
          // If date is in the past, don't allow selection
          return;
        }
      } else {
        setSelectedDate(combinedDate);
        onDateChange(combinedDate);
      }
    } else {
      setSelectedDate(undefined);
      onDateChange(undefined);
    }
  };

  const handleTimeChange = (type: "hours" | "minutes", value: string) => {
    const numValue = parseInt(value);
    const now = new Date();
    
    if (type === "hours") {
      if (value === "" || (numValue >= 0 && numValue <= 23)) {
        setHours(value);
        if (selectedDate && value !== "") {
          const newDate = new Date(selectedDate);
          const minutesNum = minutes !== "" ? parseInt(minutes) : 0;
          newDate.setHours(numValue, minutesNum, 0, 0);
          
          // Prevent selecting past time if date is today
          if (newDate.toDateString() === now.toDateString() && newDate < now) {
            return;
          }
          
          setSelectedDate(newDate);
          onDateChange(newDate);
        }
      }
    } else {
      if (value === "" || (numValue >= 0 && numValue <= 59)) {
        setMinutes(value);
        if (selectedDate && value !== "") {
          const newDate = new Date(selectedDate);
          const hoursNum = hours !== "" ? parseInt(hours) : 0;
          newDate.setHours(hoursNum, numValue, 0, 0);
          
          // Prevent selecting past time if date is today
          if (newDate.toDateString() === now.toDateString() && newDate < now) {
            return;
          }
          
          setSelectedDate(newDate);
          onDateChange(newDate);
        }
      }
    }
  };

  const handleTimeBlur = (type: "hours" | "minutes") => {
    if (type === "hours") {
      const numValue = hours === "" ? 0 : parseInt(hours) || 0;
      const clampedValue = Math.max(0, Math.min(23, numValue));
      setHours(String(clampedValue).padStart(2, "0"));
      if (selectedDate) {
        const newDate = new Date(selectedDate);
        const minutesNum = minutes !== "" ? parseInt(minutes) : 0;
        newDate.setHours(clampedValue, minutesNum, 0, 0);
        setSelectedDate(newDate);
        onDateChange(newDate);
      }
    } else {
      const numValue = minutes === "" ? 0 : parseInt(minutes) || 0;
      const clampedValue = Math.max(0, Math.min(59, numValue));
      setMinutes(String(clampedValue).padStart(2, "0"));
      if (selectedDate) {
        const newDate = new Date(selectedDate);
        const hoursNum = hours !== "" ? parseInt(hours) : 0;
        newDate.setHours(hoursNum, clampedValue, 0, 0);
        setSelectedDate(newDate);
        onDateChange(newDate);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "arena-input justify-start text-left font-normal h-10 w-full",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            <span className="flex items-center gap-2">
              {format(selectedDate, "PPP")}
              <span className="text-muted-foreground">•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(selectedDate, "HH:mm")}
              </span>
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            fromDate={new Date()}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
          <div className="border-t border-border pt-3">
            <Label className="text-xs text-muted-foreground mb-2 block">
              Time
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => handleTimeChange("hours", e.target.value)}
                  onBlur={() => handleTimeBlur("hours")}
                  className="arena-input w-16 text-center font-mono"
                  placeholder="00"
                />
                <span className="text-muted-foreground">:</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => handleTimeChange("minutes", e.target.value)}
                  onBlur={() => handleTimeBlur("minutes")}
                  className="arena-input w-16 text-center font-mono"
                  placeholder="00"
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
