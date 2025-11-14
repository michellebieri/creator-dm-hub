import { Check, CheckCheck } from 'lucide-react';

interface ReadReceiptIndicatorProps {
  readAt: string | null;
  isSender: boolean;
}

export function ReadReceiptIndicator({ readAt, isSender }: ReadReceiptIndicatorProps) {
  if (!isSender) return null;

  return (
    <div className="flex items-center">
      {readAt ? (
        <CheckCheck className="h-3 w-3 text-primary" />
      ) : (
        <Check className="h-3 w-3 text-muted-foreground" />
      )}
    </div>
  );
}
