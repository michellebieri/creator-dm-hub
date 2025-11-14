import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus } from 'lucide-react';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';
import { MessageTemplateManager } from './MessageTemplateManager';

interface MessageTemplateSelectorProps {
  creatorId: string;
  onSelectTemplate: (content: string) => void;
}

export const MessageTemplateSelector = ({
  creatorId,
  onSelectTemplate,
}: MessageTemplateSelectorProps) => {
  const { templates, loading } = useMessageTemplates(creatorId);
  const [showManager, setShowManager] = useState(false);
  const [open, setOpen] = useState(false);

  if (showManager) {
    return (
      <MessageTemplateManager
        creatorId={creatorId}
        onClose={() => setShowManager(false)}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Insert template">
          <FileText className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Message Templates</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowManager(true);
                setOpen(false);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Manage
            </Button>
          </div>
          
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading templates...</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                No templates yet
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowManager(true);
                  setOpen(false);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Template
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="p-3 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      onSelectTemplate(template.content);
                      setOpen(false);
                    }}
                  >
                    <h4 className="font-medium text-sm mb-1">{template.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.content}
                    </p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
