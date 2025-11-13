import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Lock, ArrowLeft, MoreVertical } from "lucide-react";

const MessagingInterface = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">Jane Doe</h2>
              <p className="text-xs text-muted-foreground">$5 per message</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Date Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-xs text-muted-foreground">Today</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Received Message */}
          <div className="flex gap-3 animate-slide-up">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Card className="inline-block p-3 shadow-soft max-w-md">
                <p className="text-sm">Hey! Thanks for reaching out. What would you like to talk about? 😊</p>
              </Card>
              <p className="text-xs text-muted-foreground mt-1 ml-1">10:32 AM</p>
            </div>
          </div>

          {/* Sent Message */}
          <div className="flex gap-3 justify-end animate-slide-up">
            <div className="flex-1 text-right">
              <Card className="inline-block p-3 shadow-soft gradient-primary text-primary-foreground max-w-md">
                <p className="text-sm">Hi Jane! I'd love to learn more about your creative process.</p>
              </Card>
              <p className="text-xs text-muted-foreground mt-1 mr-1">10:35 AM</p>
            </div>
          </div>

          {/* Unlockable Content */}
          <div className="flex gap-3 animate-slide-up">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Card className="p-4 shadow-soft max-w-md border-2 border-accent/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center flex-shrink-0">
                    <Lock className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Premium Content</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Exclusive behind-the-scenes video from my latest project
                    </p>
                    <Button size="sm" className="gradient-accent text-accent-foreground w-full">
                      Unlock for $15
                    </Button>
                  </div>
                </div>
              </Card>
              <p className="text-xs text-muted-foreground mt-1 ml-1">10:38 AM</p>
            </div>
          </div>

          {/* System Message */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="shadow-soft">
              You have 5 messages remaining
            </Badge>
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t bg-card px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Input
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button size="icon" className="gradient-primary text-primary-foreground">
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            $5.00 will be charged when you send this message
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessagingInterface;
