import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import {
  User,
  Bell,
  Shield,
  Settings,
  LogOut,
  Lock,
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
  Archive,
  CornerUpLeft,
  ChevronRight,
  ChevronLeft,
  Newspaper,
  Receipt,
  Wallet,
  Crown,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const More = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isCreator } = useRoleCheck();

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

  const MenuItemLink = ({ 
    title, 
    icon: Icon, 
    href,
    iconBg,
    iconColor
  }: { 
    title: string; 
    icon: any; 
    href: string;
    iconBg: string;
    iconColor: string;
  }) => (
    <button
      onClick={() => { window.location.href = href; }}
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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">More</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto">
        <Card className="m-4 overflow-hidden">
          <MenuItem title="Profile" icon={User} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/profile')} />
          <MenuItem title="Vault" icon={Archive} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/vault')} />
          {!isCreator && (
            <>
              <MenuItem title="Wallet" icon={Wallet} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/wallet')} />
              <MenuItem title="My Subscriptions" icon={Crown} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/subscriptions')} />
            </>
          )}
          <MenuItem title="Settings" icon={Settings} iconBg="bg-muted" iconColor="text-muted-foreground" onClick={() => navigate('/account-settings')} />
        </Card>

        <Card className="m-4 overflow-hidden">
          <MenuItem title="Notifications" icon={Bell} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/notification-settings')} />
        </Card>

        {isCreator && (
          <>
            <Card className="m-4 overflow-hidden">
              <MenuItem title="Revenue" icon={DollarSign} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/earnings')} />
            </Card>

            <Card className="m-4 overflow-hidden">
              <MenuItem title="Content" icon={Archive} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/content-menu')} />
              <MenuItem title="Nudges" icon={Radio} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/nudges')} />
              <MenuItem title="Subscribers" icon={Crown} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/subscribers')} />
              <MenuItem title="Followers" icon={Users} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/lists')} />
              <MenuItem title="AI Assistant" icon={Bot} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/settings/ai-persona')} />
            </Card>
          </>
        )}

        <Card className="m-4 overflow-hidden">
          <MenuItem title="Get the app" icon={Smartphone} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('#')} />
        </Card>

        <Card className="m-4 overflow-hidden">
          <MenuItemLink
            title="Support"
            icon={HelpCircle}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            href="https://wa.me/971585189982"
          />
        </Card>

        <Card className="m-4 overflow-hidden">
          <MenuItem title="Sign out" icon={LogOut} iconBg="bg-gray-500/10" iconColor="text-gray-500" onClick={handleSignOut} />
        </Card>
      </div>
    </div>
  );
};

export default More;
