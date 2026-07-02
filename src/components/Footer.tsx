import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t bg-card mt-20">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">DM.me</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Turn your direct messages into a revenue stream. Get paid for every conversation.
            </p>
          </div>

          {/* For Creators */}
          <div>
            <h3 className="font-semibold mb-4">For Creators</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/creator-auth" className="hover:text-foreground transition-colors">
                  Become a Creator
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
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
              <li>
                <Link to="/refund-policy" className="hover:text-foreground transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="hover:text-foreground transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/acceptable-use" className="hover:text-foreground transition-colors">
                  Acceptable Use Policy
                </Link>
              </li>
              <li>
                <Link to="/dmca" className="hover:text-foreground transition-colors">
                  DMCA Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/contact" className="hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} DM.me. Operated by Nextchapter AI For Online Selling (Trade License No. 1610274), Future Tower, Business Bay, Dubai, UAE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
