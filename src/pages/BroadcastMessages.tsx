import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { BroadcastMessage } from '@/components/BroadcastMessage';
import { Radio } from 'lucide-react';

export default function BroadcastMessages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Broadcast Messages</h1>
          <p className="text-muted-foreground">
            Send announcements and updates to all your customers at once
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="p-8">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="rounded-full bg-primary/10 p-6">
                <Radio className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Reach All Your Fans</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Send important updates, announcements, or promotional messages to everyone who has messaged you. Perfect for:
                </p>
              </div>
              <ul className="text-left space-y-2 text-muted-foreground">
                <li>✨ Announcing new content releases</li>
                <li>🎉 Sharing special promotions or sales</li>
                <li>📢 Making important announcements</li>
                <li>💬 Re-engaging inactive fans</li>
                <li>🎁 Sending exclusive offers</li>
              </ul>
              <BroadcastMessage />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Best Practices</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">📝 Keep it Personal</p>
                <p>Write in your own voice and make messages feel authentic, not automated.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">⏰ Timing Matters</p>
                <p>Send broadcasts when your audience is most active for better engagement.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">🎯 Clear Call-to-Action</p>
                <p>Always include what you want fans to do next - view new content, check out a sale, etc.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">📊 Don't Overdo It</p>
                <p>Limit broadcasts to important updates only - too many can feel spammy.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
