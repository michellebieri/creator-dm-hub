import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Mail,
  Lock,
  Palette,
  Globe,
  ChevronRight,
  ChevronLeft,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const AccountSettings = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const settingsItems = [
    { 
      title: 'Account', 
      icon: User, 
      path: '/profile',
      iconBg: 'bg-gray-500/20',
      iconColor: 'text-gray-500'
    },
    { 
      title: 'Notifications', 
      icon: Bell, 
      path: '/notification-settings',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-500'
    },
    { 
      title: 'Privacy', 
      icon: Shield, 
      path: '/privacy-settings',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-500'
    },
    { 
      title: 'Payments', 
      icon: CreditCard, 
      path: '/purchase-history',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-500'
    },
    { 
      title: 'Email', 
      icon: Mail, 
      path: '/email-preferences',
      iconBg: 'bg-pink-500/20',
      iconColor: 'text-pink-500'
    },
    { 
      title: 'Security', 
      icon: Lock, 
      path: '/two-factor',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-500'
    },
    { 
      title: 'Appearance', 
      icon: Palette, 
      path: '#',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-500'
    },
    { 
      title: 'Language', 
      icon: Globe, 
      path: '#',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-500'
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
          <h1 className="text-lg font-semibold">Settings</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto">
        <Card className="m-4 overflow-hidden">
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
        </Card>

        <div className="px-4 mt-4">
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
