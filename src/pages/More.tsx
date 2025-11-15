import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  MessageSquare,
  Layers,
  Package,
  Share2,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const More = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const settingsItems = [
    { 
      title: 'Account', 
      icon: User, 
      path: '/account-settings',
      iconBg: 'bg-gray-500/20',
      iconColor: 'text-gray-500'
    },
    { 
      title: 'Profile', 
      icon: User, 
      path: '/profile',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-500'
    },
    { 
      title: 'Messaging', 
      icon: MessageSquare, 
      path: '/conversations',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-500'
    },
    { 
      title: 'Subscription', 
      icon: Layers, 
      path: '/subscriptions',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-500'
    },
    { 
      title: 'Bundle', 
      icon: Package, 
      path: '/vault',
      iconBg: 'bg-pink-500/20',
      iconColor: 'text-pink-500'
    },
    { 
      title: 'Socials', 
      icon: Share2, 
      path: '/following',
      iconBg: 'bg-gray-500/20',
      iconColor: 'text-gray-500'
    },
    { 
      title: 'Management', 
      icon: SettingsIcon, 
      path: '/dashboard',
      iconBg: 'bg-gray-500/20',
      iconColor: 'text-gray-500'
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const MenuItem = ({ 
    title, 
    icon: Icon, 
    onClick, 
    iconBg, 
    iconColor 
  }: { 
    title: string; 
    icon: any; 
    onClick: () => void;
    iconBg: string;
    iconColor: string;
  }) => (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <span className="text-base font-medium">{title}</span>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">More</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto">
        <Card className="m-4 overflow-hidden">
          {menuItems.map((item, index) => (
            <MenuItem
              key={item.title}
              title={item.title}
              icon={item.icon}
              onClick={() => navigate(item.path)}
            />
          ))}
        </Card>

        <Card className="m-4 overflow-hidden">
          {contentItems.map((item) => (
            <MenuItem
              key={item.title}
              title={item.title}
              icon={item.icon}
              onClick={() => navigate(item.path)}
            />
          ))}
        </Card>

        <Card className="m-4 overflow-hidden">
          {analyticsItems.map((item) => (
            <MenuItem
              key={item.title}
              title={item.title}
              icon={item.icon}
              onClick={() => navigate(item.path)}
            />
          ))}
        </Card>

        <Card className="m-4 overflow-hidden">
          {otherItems.map((item) => (
            <MenuItem
              key={item.title}
              title={item.title}
              icon={item.icon}
              onClick={() => navigate(item.path)}
            />
          ))}
        </Card>

        <Card className="m-4 overflow-hidden">
          <MenuItem
            title="Sign out"
            icon={LogOut}
            onClick={handleSignOut}
          />
        </Card>
      </div>
    </div>
  );
};

export default More;
