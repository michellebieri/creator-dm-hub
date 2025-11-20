import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ContentBundleManager } from '@/components/ContentBundleManager';

const BundleSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unlockables, setUnlockables] = useState([]);

  useEffect(() => {
    if (user) {
      fetchUnlockables();
    }
  }, [user]);

  const fetchUnlockables = async () => {
    const { data, error } = await supabase
      .from('unlockables')
      .select('*')
      .eq('creator_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUnlockables(data);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Bundle Manager</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto p-4">
        {user && (
          <ContentBundleManager 
            creatorId={user.id} 
            unlockables={unlockables}
          />
        )}
      </div>
    </div>
  );
};

export default BundleSettings;
