import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { BundlePurchase } from "@/components/BundlePurchase";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, DollarSign, Zap, Shield, TrendingUp, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { useUnreadCount } from "@/hooks/useUnreadCount";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isCreator } = useRoleCheck();
  const unreadCount = useUnreadCount();

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
              {!isCreator && (
                <Button variant="ghost" onClick={() => navigate('/browse')}>
                  Browse Creators
                </Button>
              )}
              {user ? (
                <>
                  <Button variant="ghost" onClick={() => navigate('/conversations')} className="relative">
                    Messages
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-white text-xs">
                        {unreadCount}
                      </Badge>
                    )}
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
              {isCreator ? (
                <>
                  Connect with your<br />
                  <span className="inline-block gradient-primary bg-clip-text text-transparent">fans</span>
                </>
              ) : (
                <>
                  Connect with your<br />
                  favorite <span className="inline-block gradient-primary bg-clip-text text-transparent">creators</span>
                </>
              )}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {isCreator 
                ? "Engage with your audience and share premium content directly." 
                : "Get exclusive access to premium content and direct conversations with creators you love."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {!isCreator && (
                <Button 
                  size="lg" 
                  className="gradient-primary text-primary-foreground text-lg px-8"
                  onClick={() => navigate('/browse')}
                >
                  Browse Creators
                </Button>
              )}
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
                <span>Secure Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span>Direct Messaging</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span>Exclusive Content</span>
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

      {/* Featured Content Bundles */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Featured Content Bundles</h2>
            <p className="text-xl text-muted-foreground">
              Unlock exclusive content from your favorite creators
            </p>
          </div>
          <BundlePurchase />
          <div className="text-center mt-8">
            <Button 
              variant="outline"
              onClick={() => navigate('/creators')}
            >
              Explore All Creators
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
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Connect?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users enjoying exclusive content from their favorite creators
          </p>
          <Button 
            size="lg" 
            className="gradient-primary text-primary-foreground text-lg px-8"
            onClick={() => navigate('/browse')}
          >
            Start Browsing
          </Button>
        </div>
      </section>

      {/* Creator Link at Bottom */}
      <section className="py-8 px-4 bg-muted/30 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center">
          <Button 
            variant="link" 
            className="text-muted-foreground hover:text-primary text-sm"
            onClick={() => navigate('/creator-auth')}
          >
            Are you a creator? Get paid →
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
