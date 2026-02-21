import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Clock } from 'lucide-react';
import { Product } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useProducts, FEATURED_PRODUCT_ID } from '@/context/ProductContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { isProductAvailable } = useProducts();
  const isWishlisted = isInWishlist(product.id);
  const isAvailable = isProductAvailable(product.id);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAvailable) {
      toast.info('Coming Soon', {
        description: 'This product will be available soon!',
      });
      return;
    }

    if (product.sizesRequired) {
      toast.info('Please select a size', {
        description: 'View product details to select your size',
      });
      return;
    }

    addItem(product, 1);
    toast.success('Added to cart', {
      description: product.name,
    });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAvailable) {
      toast.info('Coming Soon', {
        description: 'You can add this to wishlist when it becomes available.',
      });
      return;
    }
    
    toggleItem(product);
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist', {
      description: product.name,
    });
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <Link to={isAvailable ? `/product/${product.id}` : '#'} className={`group block ${!isAvailable ? 'cursor-default' : ''}`}>
      <div className={`relative bg-card rounded-xl overflow-hidden shadow-card transition-all duration-300 ${isAvailable ? 'hover:shadow-product hover:-translate-y-1' : 'opacity-75'}`}>
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${isAvailable ? 'group-hover:scale-105' : 'grayscale'}`}
          />
          
          {/* Coming Soon Overlay */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-lg font-semibold text-foreground">Coming Soon</span>
              <span className="text-sm text-muted-foreground">Stay tuned!</span>
            </div>
          )}
          
          {/* Badge - only show if available */}
          {isAvailable && product.badge && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
              {product.badge}
            </Badge>
          )}

          {/* Discount Badge - only show if available */}
          {isAvailable && discount > 0 && (
            <Badge className="absolute top-3 right-3 bg-destructive text-destructive-foreground">
              -{discount}%
            </Badge>
          )}

          {/* Wishlist Button - only show if available */}
          {isAvailable && (
            <Button
              size="icon"
              variant="secondary"
              className={`absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg ${
                isWishlisted ? 'opacity-100 bg-destructive/10 hover:bg-destructive/20' : ''
              }`}
              onClick={handleToggleWishlist}
            >
              <Heart className={`h-4 w-4 transition-colors ${isWishlisted ? 'fill-destructive text-destructive' : ''}`} />
            </Button>
          )}

          {/* Quick Add Button - only show if available */}
          {isAvailable && (
            <Button
              size="icon"
              className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg"
              onClick={handleQuickAdd}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
            {product.subcategory.replace(/-/g, ' ')}
          </p>
          <h3 className={`font-medium text-foreground line-clamp-2 mb-2 transition-colors ${isAvailable ? 'group-hover:text-primary' : ''}`}>
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium">{product.rating}</span>
            <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}>
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
