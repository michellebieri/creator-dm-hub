import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Package, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentGridItemProps {
  id: string;
  thumbnailUrl: string;
  title?: string;
  caption?: string;
  price: number;
  type: 'image' | 'video' | 'bundle';
  isLocked?: boolean;
  itemCount?: number;
  onClick: () => void;
}

export function ContentGridItem({
  thumbnailUrl,
  title,
  caption,
  price,
  type,
  isLocked,
  itemCount,
  onClick
}: ContentGridItemProps) {
  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:scale-105",
        isLocked && "opacity-75"
      )}
      onClick={onClick}
    >
      <div className="relative aspect-square bg-muted">
        {type === 'bundle' ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Package className="h-16 w-16 text-primary" />
          </div>
        ) : (
          <img 
            src={thumbnailUrl} 
            alt={title || 'Content'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        
        {/* Overlay for videos */}
        {type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <Play className="h-12 w-12 text-white" fill="white" />
          </div>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Lock className="h-8 w-8 text-white" />
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 right-2">
          {type === 'bundle' ? (
            <Badge variant="secondary" className="gap-1">
              <Package className="h-3 w-3" />
              Bundle ({itemCount})
            </Badge>
          ) : type === 'video' ? (
            <Badge variant="secondary">Video</Badge>
          ) : null}
        </div>
      </div>

      <div className="p-3 space-y-1">
        {title && (
          <div className="font-medium text-sm truncate">{title}</div>
        )}
        {caption && (
          <p className="text-xs text-muted-foreground line-clamp-2">{caption}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-bold text-primary">${price.toFixed(2)}</span>
          {isLocked && (
            <Badge variant="outline" className="text-xs">
              Locked
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
