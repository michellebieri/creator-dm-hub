import { useConversationLabels } from '@/hooks/useConversationLabels';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface ConversationLabelFilterProps {
  userId: string;
  selectedLabelId: string | null;
  onSelectLabel: (labelId: string | null) => void;
}

export const ConversationLabelFilter = ({ 
  userId, 
  selectedLabelId, 
  onSelectLabel 
}: ConversationLabelFilterProps) => {
  const { labels } = useConversationLabels(userId);

  if (labels.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Filter:</span>
      {labels.map(label => (
        <Badge
          key={label.id}
          style={{ 
            backgroundColor: selectedLabelId === label.id ? label.color : 'transparent',
            borderColor: label.color,
            color: selectedLabelId === label.id ? 'white' : label.color
          }}
          className="cursor-pointer border-2 transition-all hover:scale-105"
          onClick={() => onSelectLabel(selectedLabelId === label.id ? null : label.id)}
        >
          {label.name}
          {selectedLabelId === label.id && (
            <X className="h-3 w-3 ml-1" />
          )}
        </Badge>
      ))}
      {selectedLabelId && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => onSelectLabel(null)}
        >
          Clear filter
        </Button>
      )}
    </div>
  );
};
