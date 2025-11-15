import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Archive, MessageSquare, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ContentMenu = () => {
  const navigate = useNavigate();

  const contentItems = [
    { 
      title: 'Posts', 
      icon: Archive, 
      path: '#',
      iconBg: 'bg-blue-500',
    },
    { 
      title: 'Mass messages', 
      icon: MessageSquare, 
      path: '/broadcast',
      iconBg: 'bg-purple-500',
    },
    { 
      title: 'Content vault', 
      icon: Image, 
      path: '/vault',
      iconBg: 'bg-red-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Content</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-2">
        {contentItems.map((item, index) => (
          <button
            key={index}
            onClick={() => item.path !== '#' && navigate(item.path)}
            className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                <item.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-normal">{item.title}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContentMenu;
