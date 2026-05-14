import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface MessageSchedulerProps {
  onSchedule: (date: Date) => void;
  disabled?: boolean;
}

export const MessageScheduler = ({ onSchedule, disabled }: MessageSchedulerProps) => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('12:00');

  const handleSchedule = () => {
    if (!selectedDate) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    // Check if date is in the future
    if (scheduledDateTime <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    onSchedule(scheduledDateTime);
    setOpen(false);
    setSelectedDate(undefined);
    setSelectedTime('12:00');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          title="Schedule message"
        >
          <Clock className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Select Time</Label>
            <Input
              id="time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSchedule}
            disabled={!selectedDate}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Schedule Message
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
