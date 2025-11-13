import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, DollarSign, Zap, Shield, TrendingUp, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-hero py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <nav className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">DM.me</span>
            </div>
            <div className="flex gap-4">
              {user ? (
                <>
                  <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                    Dashboard
                  </Button>
                  <Button variant="ghost" onClick={signOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate('/auth')}>
                    Sign In
                  </Button>
                  <Button 
                    className="gradient-primary text-primary-foreground"
                    onClick={() => navigate('/auth')}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </nav>

          <div className="text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Your DM inbox,<br />
              but <span className="gradient-primary bg-clip-text text-transparent">✨extra✨</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Turn your direct messages into a revenue stream. Get paid for every conversation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                className="gradient-primary text-primary-foreground text-lg px-8"
                onClick={() => navigate('/auth')}
              >
                Become a Creator
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                How It Works
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Privacy Guaranteed</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>Next-Day Payouts</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span>Set Your Price</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            Everything you need to monetize
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 shadow-medium hover:shadow-large transition-all">
              <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pay Per Message</h3>
              <p className="text-muted-foreground">
                Set your price per message. Your fans pay to start meaningful conversations with you.
              </p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-large transition-all">
              <div className="w-12 h-12 gradient-accent rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Message Packs</h3>
              <p className="text-muted-foreground">
                Offer bundles at discounted rates. Encourage bulk purchases and increase revenue.
              </p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-large transition-all">
              <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Unlockables</h3>
              <p className="text-muted-foreground">
                Send exclusive content that fans can unlock for an additional fee within your chat.
              </p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-large transition-all">
              <div className="w-12 h-12 gradient-accent rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Analytics</h3>
              <p className="text-muted-foreground">
                Track your earnings, message stats, and audience growth all in one dashboard.
              </p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-large transition-all">
              <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Next-Day Payouts</h3>
              <p className="text-muted-foreground">
                Get your money fast. Guaranteed payouts within 24 hours, every time.
              </p>
            </Card>

            <Card className="p-6 shadow-medium hover:shadow-large transition-all">
              <div className="w-12 h-12 gradient-accent rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
              <p className="text-muted-foreground">
                Priority support for creators with dedicated dispute resolution and fast response times.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-card">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center">
              <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-foreground">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Your Profile</h3>
              <p className="text-muted-foreground">
                Sign up as a creator and set up your message packs with custom pricing.
              </p>
            </Card>
            <Card className="p-6 text-center">
              <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-foreground">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Share Your Link</h3>
              <p className="text-muted-foreground">
                Share your unique creator link with your audience on social media.
              </p>
            </Card>
            <Card className="p-6 text-center">
              <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-foreground">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Paid</h3>
              <p className="text-muted-foreground">
                Fans purchase credits, you respond, and earn money from every conversation.
              </p>
            </Card>
          </div>
          <div className="text-center mt-12">
            <Button 
              size="lg" 
              className="gradient-primary text-primary-foreground"
              onClick={() => navigate('/creators')}
            >
              Browse Creators
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                90%+
              </div>
              <p className="text-muted-foreground">Creator Revenue Share</p>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                24hrs
              </div>
              <p className="text-muted-foreground">Guaranteed Payouts</p>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                100%
              </div>
              <p className="text-muted-foreground">Private & Secure</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 gradient-hero">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to turn DMs into dollars?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of creators already earning from their conversations.
          </p>
          <Button 
            size="lg" 
            className="gradient-primary text-primary-foreground text-lg px-8"
            onClick={() => navigate('/auth')}
          >
            Start Earning Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="font-semibold">DM.me</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Guidelines</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
