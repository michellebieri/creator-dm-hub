import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag, Check } from 'lucide-react';
import { useConversationLabels } from '@/hooks/useConversationLabels';
import { supabase } from '@/integrations/supabase/client';

interface ConversationLabelPickerProps {
  conversationId: string;
  userId: string;
}

export const ConversationLabelPicker = ({ conversationId, userId }: ConversationLabelPickerProps) => {
  const { labels, assignLabel, unassignLabel } = useConversationLabels(userId);
  const [assignedLabelIds, setAssignedLabelIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchAssignedLabels();
  }, [conversationId]);

  const fetchAssignedLabels = async () => {
    const { data } = await supabase
      .from('conversation_label_assignments')
      .select('label_id')
      .eq('conversation_id', conversationId);

    if (data) {
      setAssignedLabelIds(data.map(d => d.label_id));
    }
  };

  const handleToggleLabel = async (labelId: string) => {
    const isAssigned = assignedLabelIds.includes(labelId);
    
    if (isAssigned) {
      const success = await unassignLabel(conversationId, labelId);
      if (success) {
        setAssignedLabelIds(prev => prev.filter(id => id !== labelId));
      }
    } else {
      const success = await assignLabel(conversationId, labelId);
      if (success) {
        setAssignedLabelIds(prev => [...prev, labelId]);
      }
    }
  };

  const assignedLabels = labels.filter(label => assignedLabelIds.includes(label.id));

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {assignedLabels.map(label => (
        <Badge
          key={label.id}
          style={{ backgroundColor: label.color }}
          className="text-white text-xs"
        >
          {label.name}
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Tag className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-2">
            <p className="text-sm font-medium">Add Labels</p>
            {labels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No labels available. Create labels first.
              </p>
            ) : (
              labels.map(label => (
                <Button
                  key={label.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleToggleLabel(label.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Badge
                      style={{ backgroundColor: label.color }}
                      className="text-white flex-1"
                    >
                      {label.name}
                    </Badge>
                    {assignedLabelIds.includes(label.id) && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </Button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
