import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t bg-card mt-20">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">DM.me</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Turn your direct messages into a revenue stream. Get paid for every conversation.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Creators</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/auth" className="hover:text-foreground transition-colors">
                  Become a Creator
                </Link>
              </li>
              <li>
                <Link to="/browse" className="hover:text-foreground transition-colors">
                  Browse Creators
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Instagram
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Discord
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} DM.me. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
