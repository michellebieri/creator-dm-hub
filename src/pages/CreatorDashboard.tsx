import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DollarSign, MessageCircle, TrendingUp, Settings, ExternalLink } from "lucide-react";

const CreatorDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">DM.me</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
              <Avatar>
                <AvatarImage src="" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Profile Section */}
        <Card className="p-6 mb-8 shadow-medium">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" />
                <AvatarFallback className="text-xl">JD</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">Jane Doe</h1>
                <p className="text-muted-foreground">dm.me/janedoe</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Profile
              </Button>
              <Button>Edit Profile</Button>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 shadow-medium">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Total Earnings</h3>
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">$3,419.13</div>
            <p className="text-sm text-success">+12.5% from last week</p>
          </Card>

          <Card className="p-6 shadow-medium">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Messages Received</h3>
              <div className="w-10 h-10 gradient-accent rounded-lg flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">247</div>
            <p className="text-sm text-success">+8.2% from last week</p>
          </Card>

          <Card className="p-6 shadow-medium">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Avg. Per Message</h3>
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">$13.84</div>
            <p className="text-sm text-success">+4.1% from last week</p>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-medium">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
          </div>
          <div className="divide-y">
            <div className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>MJ</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Michael purchased 10 messages</p>
                  <p className="text-sm text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <Badge className="gradient-accent text-accent-foreground">+$39.00</Badge>
            </div>

            <div className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>SK</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Sarah sent you a message</p>
                  <p className="text-sm text-muted-foreground">5 hours ago</p>
                </div>
              </div>
              <Badge className="gradient-primary text-primary-foreground">+$5.00</Badge>
            </div>

            <div className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>AL</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Alex unlocked premium content</p>
                  <p className="text-sm text-muted-foreground">8 hours ago</p>
                </div>
              </div>
              <Badge className="gradient-accent text-accent-foreground">+$15.00</Badge>
            </div>

            <div className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>TC</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Taylor purchased 5 messages</p>
                  <p className="text-sm text-muted-foreground">12 hours ago</p>
                </div>
              </div>
              <Badge className="gradient-accent text-accent-foreground">+$22.00</Badge>
            </div>
          </div>
        </Card>

        {/* Pricing Settings */}
        <Card className="mt-8 shadow-medium">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Your Pricing</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Price per message</p>
                <p className="text-sm text-muted-foreground">Amount charged for each message</p>
              </div>
              <div className="text-2xl font-bold">$5.00</div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Message pack (10 messages)</p>
                <p className="text-sm text-muted-foreground">Discounted bundle option</p>
              </div>
              <div className="text-2xl font-bold">$39.00</div>
            </div>
            <Button className="w-full">Update Pricing</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreatorDashboard;
