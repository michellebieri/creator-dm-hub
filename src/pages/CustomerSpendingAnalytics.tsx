import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/StatsCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, TrendingUp, Star } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';

interface CustomerData {
  customer_id: string;
  customer_name: string;
  customer_username: string;
  total_spent: number;
  transaction_count: number;
  avg_transaction: number;
  first_purchase: string;
  last_purchase: string;
  months_active: number;
  segment: 'whale' | 'high-value' | 'regular' | 'new';
}

export default function CustomerSpendingAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('total_spent');
  const [stats, setStats] = useState({
    totalCustomers: 0,
    avgLifetimeValue: 0,
    topSpender: 0,
    repeatCustomerRate: 0,
  });
  const [segmentData, setSegmentData] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all transactions with customer details
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customer:profiles!transactions_customer_id_fkey(id, display_name, username)
        `)
        .eq('creator_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Aggregate customer data
      const customerMap = new Map<string, CustomerData>();
      
      transactions?.forEach((tx) => {
        const customerId = tx.customer_id;
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: tx.customer?.display_name || 'Unknown',
            customer_username: tx.customer?.username || 'unknown',
            total_spent: 0,
            transaction_count: 0,
            avg_transaction: 0,
            first_purchase: tx.created_at,
            last_purchase: tx.created_at,
            months_active: 0,
            segment: 'new',
          });
        }

        const customer = customerMap.get(customerId)!;
        customer.total_spent += tx.amount;
        customer.transaction_count += 1;
        customer.last_purchase = tx.created_at;
      });

      // Calculate derived metrics and assign segments
      const customerList: CustomerData[] = Array.from(customerMap.values()).map(customer => {
        customer.avg_transaction = customer.total_spent / customer.transaction_count;
        
        const firstDate = new Date(customer.first_purchase);
        const lastDate = new Date(customer.last_purchase);
        const monthsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        customer.months_active = Math.max(1, Math.round(monthsDiff));

        // Segment customers
        if (customer.total_spent >= 1000) {
          customer.segment = 'whale';
        } else if (customer.total_spent >= 500) {
          customer.segment = 'high-value';
        } else if (customer.transaction_count > 1) {
          customer.segment = 'regular';
        } else {
          customer.segment = 'new';
        }

        return customer;
      });

      setCustomers(customerList);

      // Calculate stats
      const totalSpent = customerList.reduce((sum, c) => sum + c.total_spent, 0);
      const avgLTV = customerList.length > 0 ? totalSpent / customerList.length : 0;
      const topSpender = Math.max(...customerList.map(c => c.total_spent), 0);
      const repeatCustomers = customerList.filter(c => c.transaction_count > 1).length;
      const repeatRate = customerList.length > 0 ? (repeatCustomers / customerList.length) * 100 : 0;

      setStats({
        totalCustomers: customerList.length,
        avgLifetimeValue: avgLTV,
        topSpender,
        repeatCustomerRate: repeatRate,
      });

      // Segment breakdown
      const segments = [
        { name: 'Whales ($1000+)', value: customerList.filter(c => c.segment === 'whale').length },
        { name: 'High-Value ($500+)', value: customerList.filter(c => c.segment === 'high-value').length },
        { name: 'Regular', value: customerList.filter(c => c.segment === 'regular').length },
        { name: 'New', value: customerList.filter(c => c.segment === 'new').length },
      ];
      setSegmentData(segments);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSegmentBadge = (segment: string) => {
    switch (segment) {
      case 'whale':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">🐋 Whale</Badge>;
      case 'high-value':
        return <Badge className="bg-primary/10 text-primary border-primary/20">💎 High-Value</Badge>;
      case 'regular':
        return <Badge className="bg-primary/10 text-primary border-primary/20">✓ Regular</Badge>;
      case 'new':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">✨ New</Badge>;
      default:
        return null;
    }
  };

  const filteredCustomers = customers
    .filter(c => 
      c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'total_spent':
          return b.total_spent - a.total_spent;
        case 'transaction_count':
          return b.transaction_count - a.transaction_count;
        case 'avg_transaction':
          return b.avg_transaction - a.avg_transaction;
        case 'recent':
          return new Date(b.last_purchase).getTime() - new Date(a.last_purchase).getTime();
        default:
          return 0;
      }
    });

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Customer Spending Analytics</h1>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
          />
          <StatsCard
            title="Avg Lifetime Value"
            value={`$${stats.avgLifetimeValue.toFixed(2)}`}
            icon={DollarSign}
          />
          <StatsCard
            title="Top Spender"
            value={`$${stats.topSpender.toFixed(2)}`}
            icon={Star}
          />
          <StatsCard
            title="Repeat Customer Rate"
            value={`${stats.repeatCustomerRate.toFixed(1)}%`}
            icon={TrendingUp}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Customer Segments</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={segmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Top 10 Spenders</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customers.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--foreground))" />
                <YAxis dataKey="customer_name" type="category" stroke="hsl(var(--foreground))" width={100} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="total_spent" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Customer Details</h2>
            <div className="flex gap-4">
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_spent">Total Spent</SelectItem>
                  <SelectItem value="transaction_count">Transactions</SelectItem>
                  <SelectItem value="avg_transaction">Avg Transaction</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.customer_id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{customer.customer_name}</h3>
                    <p className="text-sm text-muted-foreground">@{customer.customer_username}</p>
                  </div>
                  {getSegmentBadge(customer.segment)}
                </div>
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Lifetime Value</p>
                    <p className="font-bold text-primary">${customer.total_spent.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Transactions</p>
                    <p className="font-bold">{customer.transaction_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Transaction</p>
                    <p className="font-bold">${customer.avg_transaction.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Active Months</p>
                    <p className="font-bold">{customer.months_active}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Purchase</p>
                    <p className="font-bold">{new Date(customer.last_purchase).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
