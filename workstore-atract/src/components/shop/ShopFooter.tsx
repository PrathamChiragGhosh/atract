import React from 'react';
import { Link } from 'react-router-dom';
import atractLogo from '@/assets/atract-logo.png';

const ShopFooter: React.FC = () => {
  return (
    <footer className="bg-secondary border-t border-border mt-16">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={atractLogo} alt="Atract" className="h-8 w-auto" />
              <span className="text-lg font-semibold text-primary">Shop</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Professional essentials for the career-focused individual.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Categories</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/category/electronics" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Electronics
                </Link>
              </li>
              <li>
                <Link to="/category/fashion-men" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Fashion – Men
                </Link>
              </li>
              <li>
                <Link to="/category/fashion-women" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Fashion – Women
                </Link>
              </li>
              <li>
                <Link to="/category/ebooks" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Professional eBooks
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Shipping Info
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Returns
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Refund Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Atract. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ShopFooter;
