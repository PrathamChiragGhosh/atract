import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import ShopHeader from '@/components/shop/ShopHeader';
import ShopFooter from '@/components/shop/ShopFooter';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/CartContext';

const CartPage: React.FC = () => {
  const { items, total, updateQuantity, removeItem, itemCount } = useCart();
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <ShopHeader />
        <main className="container py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Link to="/">
              <Button size="lg" className="gap-2">
                <ArrowLeft className="h-5 w-5" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </main>
        <ShopFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader />

      <main className="container py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.size || ''}`}
                className="flex gap-4 p-4 bg-card rounded-xl border border-border"
              >
                {/* Image */}
                <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden bg-secondary">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.productId}`}
                    className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                  >
                    {item.name}
                  </Link>

                  {item.size && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Size: {item.size}
                    </p>
                  )}

                  <p className="text-lg font-bold text-foreground mt-2">
                    {formatPrice(item.price)}
                  </p>

                  {/* Quantity & Remove */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1, item.size)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1, item.size)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeItem(item.productId, item.size)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                  </span>
                  <span className="font-medium">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between mb-6">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold">{formatPrice(total)}</span>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={() => navigate('/checkout')}
              >
                Proceed to Checkout
              </Button>

              <Link
                to="/"
                className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>

      <ShopFooter />
    </div>
  );
};

export default CartPage;
