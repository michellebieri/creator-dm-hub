import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  Vault, 
  ArrowLeftRight, 
  Settings, 
  Package, 
  Radio, 
  Users, 
  CreditCard, 
  List,
  BarChart3,
  PieChart,
  DollarSign,
  Smartphone,
  HelpCircle,
  RefreshCw,
  Bell,
  Lock,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const More = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const menuItems = [
    { title: 'Profile', icon: User, path: '/profile' },
    { title: 'Vault', icon: Vault, path: '/vault' },
    { title: 'Requests', icon: ArrowLeftRight, path: '/requests' },
    { title: 'Settings', icon: Settings, path: '/account-settings' },
  ];

  const contentItems = [
    { title: 'Content', icon: Package, path: '/vault' },
    { title: 'Nudges', icon: Radio, path: '/broadcast' },
    { title: 'Followers', icon: Users, path: '/following' },
    { title: 'Subscribers', icon: CreditCard, path: '/subscribers' },
    { title: 'Lists', icon: List, path: '/lists' },
  ];

  const analyticsItems = [
    { title: 'Dashboard', icon: BarChart3, path: '/dashboard' },
    { title: 'Analytics', icon: PieChart, path: '/analytics' },
    { title: 'Revenue', icon: DollarSign, path: '/revenue' },
  ];

  const otherItems = [
    { title: 'Get the app', icon: Smartphone, path: '/get-app' },
    { title: 'Support', icon: HelpCircle, path: '/support' },
    { title: 'Switch account', icon: RefreshCw, path: '/switch-account' },
    { title: 'Notifications', icon: Bell, path: '/notification-settings' },
    { title: 'Privacy', icon: Lock, path: '/privacy-settings' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const MenuItem = ({ title, icon: Icon, onClick }: { title: string; icon: any; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
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
