import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const Nudges = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Nudges</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto">
        <div className="p-4 space-y-3">
          {[
            { label: 'Online', description: 'Messages will be sent automatically, shortly after a user comes online.' },
            { label: 'Before unlock', description: 'Messages will be sent automatically, shortly after unlockable content has been sent to a user.' },
            { label: 'After unlock', description: 'Messages will be sent automatically, shortly after a user has unlocked content.' },
          ].map(({ label, description }) => (
            <div key={label} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between py-2">
                <span className="text-base font-semibold">{label}</span>
                <Switch />
              </div>
              <button
                onClick={() => {}}
                className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded-lg px-2 transition-colors"
              >
                <span className="text-base font-normal">Settings</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <p className="text-sm text-muted-foreground py-2 mt-2 border-t border-border">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Nudges;
