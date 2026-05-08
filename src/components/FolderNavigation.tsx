import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Image, Video, Package, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderNavigationProps {
  activeFolder: 'all' | 'photos' | 'videos' | 'bundles';
  onFolderChange: (folder: 'all' | 'photos' | 'videos' | 'bundles') => void;
  counts: {
    photos: number;
    videos: number;
    bundles: number;
    total: number;
  };
}

export function FolderNavigation({ activeFolder, onFolderChange, counts }: FolderNavigationProps) {
  const folders = [
    {
      id: 'photos' as const,
      label: 'Photos',
      icon: Image,
      count: counts.photos,
      color: 'text-primary'
    },
    {
      id: 'videos' as const,
      label: 'Videos',
      icon: Video,
      count: counts.videos,
      color: 'text-purple-500'
    },
    {
      id: 'bundles' as const,
      label: 'Bundles',
      icon: Package,
      count: counts.bundles,
      color: 'text-primary'
    },
    {
      id: 'all' as const,
      label: 'All Content',
      icon: FolderOpen,
      count: counts.total,
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="w-full">
      {/* Desktop: Grid layout */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        {folders.map((folder) => {
          const Icon = folder.icon;
          const isActive = activeFolder === folder.id;
          
          return (
            <Card
              key={folder.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isActive && "ring-2 ring-primary shadow-md"
              )}
              onClick={() => onFolderChange(folder.id)}
            >
              <div className="p-4 flex flex-col items-center text-center space-y-2">
                <Icon className={cn("h-8 w-8", isActive ? "text-primary" : folder.color)} />
                <div>
                  <div className="font-semibold">{folder.label}</div>
                  <div className="text-sm text-muted-foreground">({folder.count})</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Mobile: Horizontal scroll */}
      <div className="md:hidden flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {folders.map((folder) => {
          const Icon = folder.icon;
          const isActive = activeFolder === folder.id;
          
          return (
            <Button
              key={folder.id}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "flex-shrink-0 flex items-center gap-2",
                !isActive && "bg-card"
              )}
              onClick={() => onFolderChange(folder.id)}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">
                {folder.label} ({folder.count})
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
