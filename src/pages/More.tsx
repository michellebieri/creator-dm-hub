import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Settings, 
  LogOut,
  Mail,
  Lock,
  Palette,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const More = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const MenuItem = ({ 
    title, 
    icon: Icon, 
    onClick 
  }: { 
    title: string; 
    icon: any; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-base">{title}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-screen-lg mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">More</h1>

        <Card className="mb-4">
          <div className="p-2">
            <MenuItem title="Account Settings" icon={User} onClick={() => navigate('/account-settings')} />
            <MenuItem title="Profile Settings" icon={Settings} onClick={() => navigate('/profile')} />
            <MenuItem title="Privacy Settings" icon={Shield} onClick={() => navigate('/privacy-settings')} />
            <MenuItem title="Notification Settings" icon={Bell} onClick={() => navigate('/notification-settings')} />
          </div>
        </Card>

        <Card className="mb-4">
          <div className="p-2">
            <MenuItem title="Payment History" icon={CreditCard} onClick={() => navigate('/purchase-history')} />
            <MenuItem title="Email Preferences" icon={Mail} onClick={() => navigate('/email-preferences')} />
            <MenuItem title="Two-Factor Auth" icon={Lock} onClick={() => navigate('/two-factor')} />
          </div>
        </Card>

        <Card className="mb-4">
          <div className="p-2">
            <MenuItem title="Language" icon={Globe} onClick={() => {}} />
            <MenuItem title="Theme" icon={Palette} onClick={() => {}} />
          </div>
        </Card>

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
  );
};

export default More;
