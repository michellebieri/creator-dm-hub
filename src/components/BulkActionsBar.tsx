import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Archive, ArchiveRestore, Tag, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConversationLabels } from '@/hooks/useConversationLabels';

interface BulkActionsBarProps {
  selectedCount: number;
  showArchived: boolean;
  userId: string;
  onArchive: () => void;
  onUnarchive: () => void;
  onAssignLabel: (labelId: string) => void;
  onClear: () => void;
}

export const BulkActionsBar = ({
  selectedCount,
  showArchived,
  userId,
  onArchive,
  onUnarchive,
  onAssignLabel,
  onClear,
}: BulkActionsBarProps) => {
  const { labels } = useConversationLabels(userId);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-primary text-primary-foreground rounded-full shadow-lg px-6 py-3 flex items-center gap-4">
        <Badge variant="secondary" className="bg-primary-foreground text-primary">
          {selectedCount} selected
        </Badge>
        
        {showArchived ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onUnarchive}
          >
            <ArchiveRestore className="h-4 w-4 mr-2" />
            Restore
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onArchive}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        )}

        {labels.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Tag className="h-4 w-4 mr-2" />
                Add Label
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {labels.map(label => (
                <DropdownMenuItem
                  key={label.id}
                  onClick={() => onAssignLabel(label.id)}
                >
                  <Badge
                    style={{ backgroundColor: label.color }}
                    className="text-white"
                  >
                    {label.name}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/20"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
