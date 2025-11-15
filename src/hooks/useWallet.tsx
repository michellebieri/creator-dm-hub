import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchBalance = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching wallet balance:', error);
      } else {
        setBalance(parseFloat(String(data?.wallet_balance || 0)));
      }
      setLoading(false);
    };

    fetchBalance();

    // Subscribe to balance changes
    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'wallet_balance' in payload.new) {
            setBalance(parseFloat(String((payload.new as any).wallet_balance || 0)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addFunds = async (amount: number) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add funds",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('add-funds', {
        body: { amount },
      });

      if (error) throw error;
      return data?.url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
      return null;
    }
  };

  const spend = async (amount: number, transactionType: string, description: string, relatedUserId?: string) => {
    if (!user || balance < amount) {
      return false;
    }

    try {
      const newBalance = balance - amount;

      // Update balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount: -amount,
          transaction_type: transactionType,
          description,
          related_user_id: relatedUserId,
          balance_after: newBalance,
        });

      if (transactionError) {
        console.error('Error recording transaction:', transactionError);
      }

      return true;
    } catch (error) {
      console.error('Error spending from wallet:', error);
      return false;
    }
  };

  return { balance, loading, addFunds, spend, hasBalance: balance > 0 };
};
