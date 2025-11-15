import { useNavigate } from 'react-router-dom';
import { 
  User, 
  UserCircle,
  MessageSquare,
  Layers,
  CreditCard,
  Share2,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const AccountSettings = () => {
  const navigate = useNavigate();

  const settingsItems = [
    { 
      title: 'Account', 
      icon: User, 
      path: '/profile',
      iconBg: 'bg-gray-500',
      iconColor: 'text-white'
    },
    { 
      title: 'Profile', 
      icon: UserCircle, 
      path: '/profile',
      iconBg: 'bg-blue-500',
      iconColor: 'text-white'
    },
    { 
      title: 'Messaging', 
      icon: MessageSquare, 
      path: '/conversations',
      iconBg: 'bg-green-500',
      iconColor: 'text-white'
    },
    { 
      title: 'Subscription', 
      icon: Layers, 
      path: '/subscriptions',
      iconBg: 'bg-purple-500',
      iconColor: 'text-white'
    },
    { 
      title: 'Bundle', 
      icon: CreditCard, 
      path: '#',
      iconBg: 'bg-pink-500',
      iconColor: 'text-white'
    },
    { 
      title: 'Socials', 
      icon: Share2, 
      path: '#',
      iconBg: 'bg-gray-500',
      iconColor: 'text-white'
    },
    { 
      title: 'Management', 
      icon: SettingsIcon, 
      path: '#',
      iconBg: 'bg-gray-500',
      iconColor: 'text-white'
    },
  ];

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
      className="flex items-center justify-between w-full px-4 py-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <span className="text-base font-normal">{title}</span>
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
          <h1 className="text-lg font-semibold">Settings</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto bg-card mt-4 mx-4 rounded-lg overflow-hidden">
        {settingsItems.map((item) => (
          <MenuItem
            key={item.title}
            title={item.title}
            icon={item.icon}
            iconBg={item.iconBg}
            iconColor={item.iconColor}
            onClick={() => item.path !== '#' && navigate(item.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default AccountSettings;
