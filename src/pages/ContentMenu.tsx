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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-cyan-50/50 dark:from-blue-950/20 dark:via-background dark:to-cyan-950/20 pb-20">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Content</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4 space-y-3">
        {contentItems.map((item, index) => (
          <button
            key={index}
            onClick={() => item.path !== '#' && navigate(item.path)}
            className="flex items-center justify-between w-full p-5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-background hover:from-blue-100 hover:to-blue-50 dark:hover:from-blue-900/50 dark:hover:to-blue-950/30 transition-all rounded-xl border border-blue-200 dark:border-blue-900 shadow-md hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center shadow-md`}>
                <item.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-base font-semibold text-blue-700 dark:text-blue-300">{item.title}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-blue-500" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContentMenu;
