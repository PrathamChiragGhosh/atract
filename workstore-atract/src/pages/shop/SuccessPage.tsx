import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import ShopHeader from '@/components/shop/ShopHeader';
import ShopFooter from '@/components/shop/ShopFooter';
import { Button } from '@/components/ui/button';

const SuccessPage: React.FC = () => {
  const location = useLocation();
  const orderId = location.state?.orderId || `ORD-${Date.now()}`;

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader />

      <main className="container py-16">
        <div className="max-w-lg mx-auto text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your purchase. Your order has been confirmed.
          </p>

          {/* Order Details */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-semibold">Order Details</span>
            </div>

            <div className="bg-secondary rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Order ID</p>
              <p className="font-mono font-bold text-foreground">{orderId}</p>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              A confirmation email has been sent to your registered email address.
            </p>
          </div>

          {/* What's Next */}
          <div className="bg-atract-blue-light rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-foreground mb-3">What's Next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                You'll receive an order confirmation email shortly.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                Physical items will be shipped within 2-3 business days.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                Digital products (eBooks) are delivered instantly via email.
              </li>
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Continue Shopping
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <ShopFooter />
    </div>
  );
};

export default SuccessPage;
