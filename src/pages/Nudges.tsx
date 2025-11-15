import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const Nudges = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-background to-violet-50/50 dark:from-purple-950/20 dark:via-background dark:to-violet-950/20 pb-20">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Nudges</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto">
        <div className="p-4 space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/50 dark:to-background border border-purple-200 dark:border-purple-900 shadow-lg">
            <div className="flex items-center justify-between py-2">
              <span className="text-base font-semibold text-purple-700 dark:text-purple-300">Online</span>
              <Switch />
            </div>

            <button
              onClick={() => {}}
              className="flex items-center justify-between w-full py-2 hover:bg-purple-100/50 dark:hover:bg-purple-900/20 rounded-lg px-2 transition-colors"
            >
              <span className="text-base font-normal">Settings</span>
              <ChevronRight className="h-5 w-5 text-purple-500" />
            </button>

            <p className="text-sm text-muted-foreground py-2 mt-2 border-t border-purple-200 dark:border-purple-900">
              Messages will be sent automatically, shortly after a user comes online.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/50 dark:to-background border border-violet-200 dark:border-violet-900 shadow-lg">
            <div className="flex items-center justify-between py-2">
              <span className="text-base font-semibold text-violet-700 dark:text-violet-300">Before unlock</span>
              <Switch />
            </div>

            <button
              onClick={() => {}}
              className="flex items-center justify-between w-full py-2 hover:bg-violet-100/50 dark:hover:bg-violet-900/20 rounded-lg px-2 transition-colors"
            >
              <span className="text-base font-normal">Settings</span>
              <ChevronRight className="h-5 w-5 text-violet-500" />
            </button>

            <p className="text-sm text-muted-foreground py-2 mt-2 border-t border-violet-200 dark:border-violet-900">
              Messages will be sent automatically, shortly after unlockable content has been sent to a user.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/50 dark:to-background border border-purple-200 dark:border-purple-900 shadow-lg">
            <div className="flex items-center justify-between py-2">
              <span className="text-base font-semibold text-purple-700 dark:text-purple-300">After unlock</span>
              <Switch />
            </div>

            <button
              onClick={() => {}}
              className="flex items-center justify-between w-full py-2 hover:bg-purple-100/50 dark:hover:bg-purple-900/20 rounded-lg px-2 transition-colors"
            >
              <span className="text-base font-normal">Settings</span>
              <ChevronRight className="h-5 w-5 text-purple-500" />
            </button>

            <p className="text-sm text-muted-foreground py-2 mt-2 border-t border-purple-200 dark:border-purple-900">
              Messages will be sent automatically, shortly after a user has unlocked content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nudges;
