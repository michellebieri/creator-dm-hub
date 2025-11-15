import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-screen-lg mx-auto">
          <h1 className="text-xl font-bold text-primary">dm.me</h1>
          <Button variant="ghost" size="sm">
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="pb-20">
        <Outlet />
      </main>

      <BottomNavigation />
    </div>
  );
}
