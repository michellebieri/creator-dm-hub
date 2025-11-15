import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId?: string;
  reportedMessageId?: string;
  reporterName: string;
}

export const ReportDialog = ({
  open,
  onOpenChange,
  reportedUserId,
  reportedMessageId,
  reporterName,
}: ReportDialogProps) => {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Reason required",
        description: "Please select a reason for reporting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId || null,
          reported_message_id: reportedMessageId || null,
          reason,
          description: description || null,
        });

      if (error) throw error;

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our platform safe",
      });

      onOpenChange(false);
      setReason('');
      setDescription('');
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {reportedUserId ? 'User' : 'Content'}</DialogTitle>
          <DialogDescription>
            Report {reporterName} for violating community guidelines
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                <SelectItem value="scam">Scam or Fraud</SelectItem>
                <SelectItem value="impersonation">Impersonation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more information about this report..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
