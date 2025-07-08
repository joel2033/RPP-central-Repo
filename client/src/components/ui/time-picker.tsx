import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { ScrollArea } from './scroll-area';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Generate time slots in 15-minute intervals
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = new Date();
      time.setHours(hour, minute, 0, 0);
      
      // Format as 12-hour with AM/PM
      const timeString = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).replace(/\s/g, ''); // Remove spaces between time and AM/PM
      
      slots.push(timeString);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export function TimePicker({
  value,
  onChange,
  placeholder = "Set a start time",
  disabled = false,
  className
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  const handleSelect = (time: string) => {
    onChange(time);
    setOpen(false);
  };

  // Auto-scroll to current time when dropdown opens
  useEffect(() => {
    if (open && scrollContainerRef.current) {
      const currentTimeIndex = getCurrentTimeIndex();
      if (currentTimeIndex >= 0) {
        const buttonHeight = 40; // Approximate button height with margin
        const scrollTop = currentTimeIndex * buttonHeight - 120; // Center it
        scrollContainerRef.current.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth'
        });
      }
    }
  }, [open]);

  // Get current time as default scroll position
  const getCurrentTimeIndex = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Round to nearest 15-minute interval
    const roundedMinute = Math.ceil(currentMinute / 15) * 15;
    const adjustedHour = roundedMinute === 60 ? currentHour + 1 : currentHour;
    const finalMinute = roundedMinute === 60 ? 0 : roundedMinute;
    
    const currentTime = new Date();
    currentTime.setHours(adjustedHour, finalMinute, 0, 0);
    
    const timeString = currentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(/\s/g, '');
    
    return timeSlots.indexOf(timeString);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start" side="bottom">
        <div 
          ref={scrollContainerRef}
          className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="p-1">
            {timeSlots.map((time, index) => (
              <Button
                key={time}
                variant={value === time ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-left font-normal mb-1 hover:bg-accent hover:text-accent-foreground transition-colors duration-150",
                  value === time && "bg-primary text-primary-foreground"
                )}
                onClick={() => handleSelect(time)}
              >
                {time}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}