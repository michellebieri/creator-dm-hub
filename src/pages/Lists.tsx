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
    <div className="min-h-screen bg-gradient-to-br from-pink-50/50 via-background to-rose-50/50 dark:from-pink-950/20 dark:via-background dark:to-rose-950/20 pb-20">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Lists</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto">
        <div className="p-4">
          <button
            onClick={() => {}}
            className="flex items-center justify-between w-full px-4 py-4 bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/50 dark:to-background hover:from-pink-100 hover:to-pink-50 dark:hover:from-pink-900/50 dark:hover:to-pink-950/30 transition-all rounded-xl border border-pink-200 dark:border-pink-900 shadow-md hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-semibold text-pink-700 dark:text-pink-300">Create new list</span>
            </div>
            <ChevronRight className="h-5 w-5 text-pink-500" />
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">Custom Lists</p>
        </div>

        <div className="px-4 py-3 mt-4">
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Default Lists</p>
        </div>

        <div className="px-4 space-y-2">
          {defaultLists.map((list, index) => (
            <button
              key={index}
              onClick={() => list.path !== '#' && navigate(list.path)}
              className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-br from-pink-50/50 to-white/50 dark:from-pink-950/30 dark:to-background/50 hover:from-pink-100/50 hover:to-pink-50/50 dark:hover:from-pink-900/30 dark:hover:to-pink-950/20 transition-all rounded-lg border border-pink-100 dark:border-pink-900/50"
            >
              <span className="text-base font-normal">{list.name}</span>
              <ChevronRight className="h-5 w-5 text-pink-400 dark:text-pink-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Lists;
