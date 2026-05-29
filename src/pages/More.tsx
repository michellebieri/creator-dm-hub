import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import {
  User,
  Bell,
  Shield,
  LogOut,
  Radio,
  Users,
  DollarSign,
  Smartphone,
  HelpCircle,
  Archive,
  ChevronRight,
  ChevronLeft,
  Wallet,
  Crown,
  Bot,
  MessageSquare,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const More = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isCreator, isAdmin } = useRoleCheck();
  const [showGetApp, setShowGetApp] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/auth');
    } finally {
      setIsSigningOut(false);
    }
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
          <div className="w-10" />
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
              <MenuItem title="AI Drafts" icon={Bot} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/ai-drafts')} />
              <MenuItem title="Messaging" icon={MessageSquare} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/settings/messaging')} />
            </Card>
          </>
        )}

        {isAdmin && (
          <Card className="m-4 overflow-hidden border-primary/30">
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Admin</p>
            </div>
            <MenuItem title="Admin Panel" icon={Shield} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => navigate('/admin')} />
          </Card>
        )}

        <Card className="m-4 overflow-hidden">
          <MenuItem title="Get the app" icon={Smartphone} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => setShowGetApp(true)} />
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
          <MenuItem title={isSigningOut ? 'Signing out…' : 'Sign out'} icon={LogOut} iconBg="bg-gray-500/10" iconColor="text-gray-500" onClick={handleSignOut} />
        </Card>
      </div>

      {/* PWA install instructions */}
      <Dialog open={showGetApp} onOpenChange={setShowGetApp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Save dm.me to your phone
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 text-sm">
            <div className="space-y-3">
              <p className="font-semibold text-base">iPhone / Safari</p>
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex gap-2"><span className="font-bold text-foreground">1.</span> Open dm.me in <strong className="text-foreground">Safari</strong> (not Chrome)</li>
                <li className="flex gap-2"><span className="font-bold text-foreground">2.</span> Tap the <strong className="text-foreground">Share</strong> icon at the bottom of the screen <span className="text-lg">⬆</span></li>
                <li className="flex gap-2"><span className="font-bold text-foreground">3.</span> Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></li>
                <li className="flex gap-2"><span className="font-bold text-foreground">4.</span> Tap <strong className="text-foreground">Add</strong> — done!</li>
              </ol>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="font-semibold text-base">Android / Chrome</p>
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex gap-2"><span className="font-bold text-foreground">1.</span> Open dm.me in <strong className="text-foreground">Chrome</strong></li>
                <li className="flex gap-2"><span className="font-bold text-foreground">2.</span> Tap the <strong className="text-foreground">⋮</strong> menu (top right)</li>
                <li className="flex gap-2"><span className="font-bold text-foreground">3.</span> Tap <strong className="text-foreground">"Add to Home screen"</strong></li>
                <li className="flex gap-2"><span className="font-bold text-foreground">4.</span> Tap <strong className="text-foreground">Add</strong> — done!</li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-1">
              The app will appear on your home screen and works like a native app — no App Store needed.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default More;
