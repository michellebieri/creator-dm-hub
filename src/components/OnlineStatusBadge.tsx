import { usePresence } from "@/hooks/usePresence";

interface OnlineStatusBadgeProps {
  userId: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function OnlineStatusBadge({ userId, showLabel = false, size = 'md' }: OnlineStatusBadgeProps) {
  const { getUserStatus } = usePresence();
  const status = getUserStatus(userId);

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-400',
  };

  const statusLabels = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline',
  };

  if (status === 'offline' && !showLabel) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={`rounded-full ${sizeClasses[size]} ${statusColors[status]} ring-2 ring-background`} />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{statusLabels[status]}</span>
      )}
    </div>
  );
}
