import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Star, Shield, Zap } from "lucide-react";

const CreatorProfile = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">DM.me</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Avatar className="h-32 w-32 mx-auto mb-6 shadow-large">
            <AvatarImage src="" />
            <AvatarFallback className="text-4xl">JD</AvatarFallback>
          </Avatar>
          <h1 className="text-4xl font-bold mb-3">Jane Doe</h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Content creator, entrepreneur, and digital artist. Let's connect and talk about creativity, business, and everything in between! ✨
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Badge variant="secondary" className="shadow-soft">
              <Star className="h-3 w-3 mr-1" />
              Featured Creator
            </Badge>
            <Badge variant="secondary" className="shadow-soft">
              <Shield className="h-3 w-3 mr-1" />
              Verified
            </Badge>
            <Badge variant="secondary" className="shadow-soft">
              <Zap className="h-3 w-3 mr-1" />
              Fast Response
            </Badge>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-8">Start a Conversation</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Single Message */}
            <Card className="p-6 shadow-medium hover:shadow-large transition-all">
              <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Single Message</h3>
              <p className="text-muted-foreground mb-4">
                Send one message and get a personal response
              </p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">$5</span>
                <span className="text-muted-foreground">per message</span>
              </div>
              <Button className="w-full gradient-primary text-primary-foreground">
                Send Message
              </Button>
            </Card>

            {/* Message Pack */}
            <Card className="p-6 shadow-medium hover:shadow-large transition-all border-2 border-accent/20 relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-accent text-accent-foreground">
                Best Value
              </Badge>
              <div className="w-12 h-12 gradient-accent rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Message Pack</h3>
              <p className="text-muted-foreground mb-4">
                Get 10 messages at a discounted rate
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold">$39</span>
                <span className="text-muted-foreground line-through">$50</span>
              </div>
              <p className="text-sm text-success mb-4">Save $11 (22% off)</p>
              <Button className="w-full gradient-accent text-accent-foreground">
                Buy Message Pack
              </Button>
            </Card>
          </div>

          {/* Payment Info */}
          <Card className="p-6 shadow-soft bg-muted/50">
            <h4 className="font-semibold mb-3 text-center">Safe & Secure Payments</h4>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Privacy Guaranteed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Apple Pay</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Google Pay</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Credit Card</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 px-4 bg-card">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-6">About</h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground">
              Hi! I'm Jane, a full-time content creator and digital entrepreneur. I love connecting with my community 
              and having real conversations about creativity, building a business, and staying inspired.
            </p>
            <p className="text-muted-foreground mt-4">
              When you message me, you're getting direct access to my insights, advice, and personal experiences. 
              I respond to every message personally and love helping people on their creative journey!
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-4 mt-12">
        <div className="container mx-auto max-w-4xl text-center text-sm text-muted-foreground">
          <p>Powered by DM.me • Privacy Guaranteed • Secure Payments</p>
        </div>
      </footer>
    </div>
  );
};

export default CreatorProfile;
