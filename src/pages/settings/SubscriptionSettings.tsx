import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscriptionTiersManager } from '@/components/SubscriptionTiersManager';

const SubscriptionSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Subscription Tiers</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4">
        <SubscriptionTiersManager />
      </div>
    </div>
  );
};

export default SubscriptionSettings;
