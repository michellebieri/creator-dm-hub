import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Lists = () => {
  const navigate = useNavigate();

  const defaultLists = [
    { name: 'All (0)', path: '#' },
    { name: 'All followers (0)', path: '/following' },
    { name: 'Paying followers (0)', path: '#' },
    { name: 'Non-paying followers (0)', path: '#' },
    { name: 'All subscribers (0)', path: '/subscriptions' },
    { name: 'Lost subscribers (0)', path: '#' },
    { name: 'Other customers (0)', path: '#' },
    { name: '$100+ spenders (0)', path: '#' },
    { name: '$1000+ spenders (0)', path: '#' },
    { name: 'Avoid sending mass messages (0)', path: '#' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Lists</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto">
        <button
          onClick={() => {}}
          className="flex items-center justify-between w-full px-4 py-4 hover:bg-muted/50 transition-colors border-b border-border"
        >
          <div className="flex items-center gap-3">
            <Plus className="h-5 w-5" />
            <span className="text-base font-normal">Create new list</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Lists</p>
        </div>

        <div className="px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Default Lists</p>
        </div>

        {defaultLists.map((list, index) => (
          <button
            key={index}
            onClick={() => list.path !== '#' && navigate(list.path)}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-muted/50 transition-colors border-b border-border"
          >
            <span className="text-base font-normal">{list.name}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Lists;
