import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, Plus, Trash2, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface AutoReply {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  trigger_condition: string;
  schedule_start: string | null;
  schedule_end: string | null;
  days_active: string[];
}

interface AutoReplyManagerProps {
  creatorId: string;
}

export function AutoReplyManager({ creatorId }: AutoReplyManagerProps) {
  const [autoReplies, setAutoReplies] = useState<AutoReply[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [triggerCondition, setTriggerCondition] = useState('always');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [daysActive, setDaysActive] = useState<string[]>([
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ]);

  const weekDays = [
    { value: 'monday', label: 'Mon' },
    { value: 'tuesday', label: 'Tue' },
    { value: 'wednesday', label: 'Wed' },
    { value: 'thursday', label: 'Thu' },
    { value: 'friday', label: 'Fri' },
    { value: 'saturday', label: 'Sat' },
    { value: 'sunday', label: 'Sun' },
  ];

  useEffect(() => {
    fetchAutoReplies();
  }, [creatorId]);

  const fetchAutoReplies = async () => {
    const { data, error } = await supabase
      .from('auto_replies')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching auto-replies:', error);
      return;
    }

    setAutoReplies(data || []);
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setTriggerCondition('always');
    setScheduleStart('');
    setScheduleEnd('');
    setDaysActive(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
    setEditingId(null);
  };

  const handleEdit = (reply: AutoReply) => {
    setEditingId(reply.id);
    setTitle(reply.title);
    setMessage(reply.message);
    setTriggerCondition(reply.trigger_condition);
    setScheduleStart(reply.schedule_start || '');
    setScheduleEnd(reply.schedule_end || '');
    setDaysActive(reply.days_active);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!title || !message) {
      toast({
        title: 'Error',
        description: 'Title and message are required',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      creator_id: creatorId,
      title,
      message,
      trigger_condition: triggerCondition,
      schedule_start: scheduleStart || null,
      schedule_end: scheduleEnd || null,
      days_active: daysActive,
    };

    if (editingId) {
      const { error } = await supabase
        .from('auto_replies')
        .update(data)
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Updated',
        description: 'Auto-reply updated successfully',
      });
    } else {
      const { error } = await supabase
        .from('auto_replies')
        .insert(data);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Created',
        description: 'Auto-reply created successfully',
      });
    }

    fetchAutoReplies();
    setShowDialog(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this auto-reply?')) return;

    const { error } = await supabase
      .from('auto_replies')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Deleted',
      description: 'Auto-reply deleted',
    });

    fetchAutoReplies();
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('auto_replies')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    fetchAutoReplies();
  };

  const toggleDay = (day: string) => {
    setDaysActive(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Auto-Replies</h2>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Auto-Reply
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Create'} Auto-Reply</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g., Away Message"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Your auto-reply message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label>Trigger</Label>
                <Select value={triggerCondition} onValueChange={setTriggerCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always (immediate)</SelectItem>
                    <SelectItem value="first_message">First message only</SelectItem>
                    <SelectItem value="scheduled">During scheduled hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {triggerCondition === 'scheduled' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={scheduleStart}
                        onChange={(e) => setScheduleStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={scheduleEnd}
                        onChange={(e) => setScheduleEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Active Days</Label>
                    <div className="flex gap-2 flex-wrap">
                      {weekDays.map((day) => (
                        <div key={day.value} className="flex items-center gap-2">
                          <Checkbox
                            id={day.value}
                            checked={daysActive.includes(day.value)}
                            onCheckedChange={() => toggleDay(day.value)}
                          />
                          <label htmlFor={day.value} className="text-sm cursor-pointer">
                            {day.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  {editingId ? 'Update' : 'Create'}
                </Button>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {autoReplies.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No auto-replies yet. Create one to automatically respond to messages.</p>
          </Card>
        ) : (
          autoReplies.map((reply) => (
            <Card key={reply.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{reply.title}</h3>
                    {reply.is_active && (
                      <Badge variant="default">Active</Badge>
                    )}
                    {reply.trigger_condition === 'scheduled' && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Scheduled
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{reply.message}</p>
                  {reply.trigger_condition === 'scheduled' && reply.schedule_start && reply.schedule_end && (
                    <p className="text-xs text-muted-foreground">
                      Active: {reply.schedule_start} - {reply.schedule_end} on {reply.days_active.map(d => d.slice(0, 3)).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={reply.is_active}
                    onCheckedChange={() => toggleActive(reply.id, reply.is_active)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(reply)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(reply.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
