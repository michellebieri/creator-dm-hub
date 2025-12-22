import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, MessageCircle, Plus, Vault, MoreHorizontal, Home, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoleCheck } from '@/hooks/useRoleCheck';

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCreator } = useRoleCheck();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-screen-lg mx-auto px-2">
        <Link to={isCreator ? "/earnings" : "/dashboard"} className="flex flex-col items-center justify-center flex-1">
          {isCreator ? (
            <BarChart3 className={`h-6 w-6 ${isActive('/earnings') ? 'text-primary' : 'text-muted-foreground'}`} />
          ) : (
            <Home className={`h-6 w-6 ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`} />
          )}
          <span className={`text-xs mt-1 ${isActive(isCreator ? '/earnings' : '/dashboard') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            {isCreator ? 'Revenue' : 'Home'}
          </span>
        </Link>

        {/* Browse Creators - only for customers */}
        {!isCreator && (
          <Link to="/browse" className="flex flex-col items-center justify-center flex-1">
            <Users className={`h-6 w-6 ${isActive('/browse') ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs mt-1 ${isActive('/browse') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Discover
            </span>
          </Link>
        )}
        
        <Link to="/conversations" className="flex flex-col items-center justify-center flex-1">
          <MessageCircle className={`h-6 w-6 ${isActive('/conversations') ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-xs mt-1 ${isActive('/conversations') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Messages
          </span>
        </Link>
        
        {isCreator && (
          <div className="flex-1 flex justify-center -mt-4">
            <Button 
              size="lg" 
              className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg"
              onClick={() => navigate('/content-upload')}
            >
              <Plus className="h-7 w-7 text-primary-foreground" />
            </Button>
          </div>
        )}
        
        <Link to="/vault" className="flex flex-col items-center justify-center flex-1">
          <Vault className={`h-6 w-6 ${isActive('/vault') || isActive('/content-vault') ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-xs mt-1 ${isActive('/vault') || isActive('/content-vault') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Vault
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
