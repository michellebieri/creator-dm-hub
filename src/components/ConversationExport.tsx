import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Download } from 'lucide-react';
import { useConversationExport } from '@/hooks/useConversationExport';

interface ConversationExportProps {
  conversationId: string;
}

export const ConversationExport = ({ conversationId }: ConversationExportProps) => {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'json' | 'txt'>('txt');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const { exportConversation, exporting } = useConversationExport();

  const handleExport = async () => {
    await exportConversation(conversationId, {
      format,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      includeMetadata,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(val) => setFormat(val as 'json' | 'txt')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="txt" id="txt" />
                <Label htmlFor="txt" className="cursor-pointer font-normal">
                  Text File (.txt) - Easy to read
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="cursor-pointer font-normal">
                  JSON (.json) - Structured data
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label>Date Range (Optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to export all messages
            </p>
          </div>

          {/* Metadata Option */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include Metadata</Label>
              <p className="text-xs text-muted-foreground">
                Include conversation details and participants
              </p>
            </div>
            <Switch
              checked={includeMetadata}
              onCheckedChange={setIncludeMetadata}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
