import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tag, Plus, Trash2, Pencil, X } from 'lucide-react';
import { useConversationLabels } from '@/hooks/useConversationLabels';

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

interface ConversationLabelManagerProps {
  userId: string;
}

export const ConversationLabelManager = ({ userId }: ConversationLabelManagerProps) => {
  const { labels, createLabel, updateLabel, deleteLabel } = useConversationLabels(userId);
  const [open, setOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[6]);
  const [editingLabel, setEditingLabel] = useState<{ id: string; name: string; color: string } | null>(null);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    const success = await createLabel(newLabelName, selectedColor);
    if (success) {
      setNewLabelName('');
      setSelectedColor(PRESET_COLORS[6]);
    }
  };

  const handleUpdateLabel = async () => {
    if (!editingLabel || !editingLabel.name.trim()) return;

    const success = await updateLabel(editingLabel.id, editingLabel.name, editingLabel.color);
    if (success) {
      setEditingLabel(null);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    await deleteLabel(labelId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag className="h-4 w-4 mr-2" />
          Manage Labels
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Create new label */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label>Create New Label</Label>
            <Input
              placeholder="Label name"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateLabel()}
            />
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleCreateLabel} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Label
            </Button>
          </div>

          {/* Existing labels */}
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              <Label>Your Labels</Label>
              {labels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No labels yet. Create one above!
                </p>
              ) : (
                labels.map((label) => (
                  <div key={label.id} className="flex items-center gap-2 p-2 border rounded-lg">
                    {editingLabel?.id === label.id ? (
                      <>
                        <Input
                          value={editingLabel.name}
                          onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                          className="flex-1"
                        />
                        <div className="flex gap-1">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded-full border ${
                                editingLabel.color === color ? 'border-foreground' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditingLabel({ ...editingLabel, color })}
                            />
                          ))}
                        </div>
                        <Button size="sm" onClick={handleUpdateLabel}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingLabel(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge
                          style={{ backgroundColor: label.color }}
                          className="flex-1 text-white"
                        >
                          {label.name}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditingLabel(label)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleDeleteLabel(label.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
