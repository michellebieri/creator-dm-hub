import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  message_type?: string;
}

interface MessageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  onSelectMessage: (messageId: string) => void;
}

export function MessageSearchDialog({ 
  open, 
  onOpenChange, 
  messages,
  onSelectMessage 
}: MessageSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [messageType, setMessageType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const filteredMessages = messages.filter(msg => {
    const matchesQuery = query ? msg.content.toLowerCase().includes(query.toLowerCase()) : true;
    const matchesType = messageType === 'all' || msg.message_type === messageType;
    const matchesDateFrom = dateFrom ? new Date(msg.created_at) >= dateFrom : true;
    const matchesDateTo = dateTo ? new Date(msg.created_at) <= dateTo : true;
    
    return matchesQuery && matchesType && matchesDateFrom && matchesDateTo;
  });

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-primary/20 text-foreground">{part}</mark>
      ) : (
        part
      )
    );
  };

  const clearFilters = () => {
    setQuery('');
    setMessageType('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Message type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
                <SelectItem value="unlockable">Unlockable</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[150px] justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "MMM d") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[150px] justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "MMM d") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mt-4">
          {filteredMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages found
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <Card 
                key={msg.id}
                className="p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  onSelectMessage(msg.id);
                  onOpenChange(false);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm flex-1">
                    {msg.message_type === 'voice' 
                      ? '🎤 Voice message'
                      : highlightText(msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : ''), query)
                    }
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
