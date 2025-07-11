import React, { memo, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const TimePicker = memo(({
  value,
  onChange,
  placeholder = "Select time",
  disabled,
  className,
}: TimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Generate time options (15-minute intervals)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const timeLabel = new Date(`2000-01-01T${timeValue}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      timeOptions.push({ value: timeValue, label: timeLabel });
    }
  }

  const handleTimeSelect = (timeValue: string) => {
    onChange(timeValue);
    setIsOpen(false);
  };

  const getCurrentTimeDisplay = () => {
    if (!value) return placeholder;
    const option = timeOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Auto-scroll to current time when opened
  useEffect(() => {
    if (isOpen && scrollAreaRef.current && value) {
      const selectedIndex = timeOptions.findIndex(opt => opt.value === value);
      if (selectedIndex >= 0) {
        const scrollTop = selectedIndex * 40; // Approximate item height
        setTimeout(() => {
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, [isOpen, value, timeOptions]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
          {getCurrentTimeDisplay()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div 
          className="h-60 overflow-y-auto focus:outline-none time-picker-scroll smooth-scroll"
          style={{ 
            maxHeight: '250px',
            overscrollBehavior: 'contain'
          }}
          ref={scrollAreaRef}
          tabIndex={0}
          onWheel={(e) => {
            // Ensure wheel events work when hovering
            e.stopPropagation();
          }}
          onMouseEnter={(e) => {
            // Focus the scrollable container to enable wheel events
            e.currentTarget.focus();
          }}
        >
          <div className="p-1">
            {timeOptions.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100",
                  value === option.value && "bg-blue-100 text-blue-900 hover:bg-blue-200"
                )}
                onClick={() => handleTimeSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

TimePicker.displayName = 'TimePicker';