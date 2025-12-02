import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User, MessageSquare, Layers, Package, Share2, Bell, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoleCheck } from '@/hooks/useRoleCheck';

const AccountSettings = () => {
  const navigate = useNavigate();
  const { isCreator } = useRoleCheck();

  const creatorSections = [
    { title: 'Messaging', icon: MessageSquare, path: '/settings/messaging', bgColor: 'bg-green-500/10', iconColor: 'text-green-500' },
    { title: 'Subscription', icon: Layers, path: '/settings/subscription', bgColor: 'bg-purple-500/10', iconColor: 'text-purple-500' },
    { title: 'Bundle', icon: Package, path: '/settings/bundle', bgColor: 'bg-pink-500/10', iconColor: 'text-pink-500' },
    { title: 'Socials', icon: Share2, path: '/settings/socials', bgColor: 'bg-muted', iconColor: 'text-muted-foreground' },
  ];

  const userSections = [
    { title: 'Account Settings', icon: User, path: '/settings/profile', bgColor: 'bg-blue-500/10', iconColor: 'text-blue-500' },
    { title: 'Notification Preferences', icon: Bell, path: '/notification-settings', bgColor: 'bg-green-500/10', iconColor: 'text-green-500' },
    { title: 'Subscription Management', icon: Star, path: '/subscriptions', bgColor: 'bg-orange-500/10', iconColor: 'text-orange-500' },
  ];

  const sections = isCreator ? creatorSections : userSections;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-2">
        {sections.map((section) => (
          <button
            key={section.path}
            onClick={() => navigate(section.path)}
            className="flex items-center justify-between w-full p-4 bg-card rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${section.bgColor} flex items-center justify-center`}>
                <section.icon className={`h-6 w-6 ${section.iconColor}`} />
              </div>
              <span className="text-base font-medium">{section.title}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default AccountSettings;
