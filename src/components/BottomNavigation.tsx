import { Link, useLocation } from 'react-router-dom';
import { BarChart3, MessageCircle, Plus, Bell, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const BottomNavigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-screen-lg mx-auto px-2">
        <Link to="/dashboard" className="flex flex-col items-center justify-center flex-1">
          <BarChart3 className={`h-6 w-6 ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-xs mt-1 ${isActive('/dashboard') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Dashboard
          </span>
        </Link>
        
        <Link to="/conversations" className="flex flex-col items-center justify-center flex-1">
          <MessageCircle className={`h-6 w-6 ${isActive('/conversations') ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-xs mt-1 ${isActive('/conversations') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Chats
          </span>
        </Link>
        
        <div className="flex-1 flex justify-center -mt-4">
          <Button 
            size="lg" 
            className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg"
          >
            <Plus className="h-7 w-7 text-primary-foreground" />
          </Button>
        </div>
        
        <Link to="/notifications" className="flex flex-col items-center justify-center flex-1">
          <Bell className={`h-6 w-6 ${isActive('/notifications') ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-xs mt-1 ${isActive('/notifications') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Notifs
          </span>
        </Link>
        
        <Link to="/more" className="flex flex-col items-center justify-center flex-1">
          <MoreHorizontal className={`h-6 w-6 ${isActive('/more') ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-xs mt-1 ${isActive('/more') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            More
          </span>
        </Link>
      </div>
    </nav>
  );
};
