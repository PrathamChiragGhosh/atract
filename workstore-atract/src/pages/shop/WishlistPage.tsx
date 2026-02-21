import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react';
import ShopHeader from '@/components/shop/ShopHeader';
import ShopFooter from '@/components/shop/ShopFooter';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

const WishlistPage: React.FC = () => {
  const { items, removeItem } = useWishlist();
  const { addItem } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleMoveToCart = (product: typeof items[0]) => {
    if (product.sizesRequired) {
      toast.info('Please select a size', {
        description: 'View product details to select your size before adding to cart',
      });
      return;
    }
    addItem(product, 1);
    removeItem(product.id);
    toast.success('Moved to cart', {
      description: product.name,
    });
  };

  const handleRemove = (productId: string, productName: string) => {
    removeItem(productId);
    toast.success('Removed from wishlist', {
      description: productName,
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <ShopHeader />
        <main className="container py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Your wishlist is empty</h1>
            <p className="text-muted-foreground mb-8">
              Save items you love by clicking the heart icon on any product.
            </p>
            <Link to="/">
              <Button size="lg" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Browse Products
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

      <main className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">My Wishlist</h1>
            <p className="text-muted-foreground mt-1">
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>

        {/* Wishlist Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((product) => {
            const discount = product.originalPrice
              ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
              : 0;

            return (
              <div
                key={product.id}
                className="bg-card rounded-xl overflow-hidden shadow-card hover:shadow-product transition-shadow"
              >
                {/* Image */}
                <Link to={`/product/${product.id}`} className="block">
                  <div className="relative aspect-square overflow-hidden bg-secondary">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    {discount > 0 && (
                      <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-medium px-2 py-1 rounded">
                        -{discount}%
                      </span>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                    {product.subcategory.replace(/-/g, ' ')}
                  </p>
                  <Link to={`/product/${product.id}`}>
                    <h3 className="font-medium text-foreground line-clamp-2 mb-2 hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold text-foreground">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2"
                      size="sm"
                      onClick={() => handleMoveToCart(product)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {product.sizesRequired ? 'View Details' : 'Move to Cart'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(product.id, product.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <ShopFooter />
    </div>
  );
};

export default WishlistPage;
