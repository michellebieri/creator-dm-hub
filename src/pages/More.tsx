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
  Wallet
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
          <MenuItem title="Profile" icon={User} iconBg="bg-blue-500/10" iconColor="text-blue-500" onClick={() => navigate('/profile')} />
          <MenuItem title="Vault" icon={Archive} iconBg="bg-blue-500/10" iconColor="text-blue-500" onClick={() => navigate('/vault')} />
          <MenuItem title="Wallet" icon={Wallet} iconBg="bg-green-500/10" iconColor="text-green-500" onClick={() => navigate('/wallet')} />
          <MenuItem title="Settings" icon={Settings} iconBg="bg-gray-500/10" iconColor="text-gray-500" onClick={() => navigate('/account-settings')} />
        </Card>

        <Card className="m-4 overflow-hidden">
          <MenuItem title="Notifications" icon={Bell} iconBg="bg-red-500/10" iconColor="text-red-500" onClick={() => navigate('/notification-settings')} />
        </Card>

        {isCreator && (
          <>
            <Card className="m-4 overflow-hidden">
              <MenuItem title="Revenue" icon={DollarSign} iconBg="bg-green-500/10" iconColor="text-green-500" onClick={() => navigate('/earnings')} />
            </Card>

            <Card className="m-4 overflow-hidden">
              <MenuItem title="Content" icon={Archive} iconBg="bg-blue-500/10" iconColor="text-blue-500" onClick={() => navigate('/content-menu')} />
              <MenuItem title="Nudges" icon={Radio} iconBg="bg-purple-500/10" iconColor="text-purple-500" onClick={() => navigate('/nudges')} />
              <MenuItem title="Followers & Subscribers" icon={List} iconBg="bg-purple-500/10" iconColor="text-purple-500" onClick={() => navigate('/lists')} />
            </Card>
          </>
        )}

        <Card className="m-4 overflow-hidden">
          <MenuItem title="Get the app" icon={Smartphone} iconBg="bg-yellow-500/10" iconColor="text-yellow-500" onClick={() => navigate('#')} />
        </Card>

        <Card className="m-4 overflow-hidden">
          <MenuItem title="Support" icon={HelpCircle} iconBg="bg-blue-500/10" iconColor="text-blue-500" onClick={() => window.open('https://wa.me/971585189982', '_blank', 'noopener,noreferrer')} />
        </Card>

        <Card className="m-4 overflow-hidden">
          <MenuItem title="Sign out" icon={LogOut} iconBg="bg-gray-500/10" iconColor="text-gray-500" onClick={handleSignOut} />
        </Card>
      </div>
    </div>
  );
};

export default More;
