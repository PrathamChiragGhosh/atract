import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Star, Minus, Plus, ShoppingCart, Heart, Share2, Check, Clock } from 'lucide-react';
import ShopHeader from '@/components/shop/ShopHeader';
import ShopFooter from '@/components/shop/ShopFooter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useProducts, FEATURED_PRODUCT_ID } from '@/context/ProductContext';
import { toast } from 'sonner';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { getProductById, getCategoryBySlug, isProductAvailable } = useProducts();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const product = id ? getProductById(id) : undefined;
  const category = product ? getCategoryBySlug(product.category) : undefined;
  const isWishlisted = product ? isInWishlist(product.id) : false;
  const isAvailable = product ? isProductAvailable(product.id) : false;

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <ShopHeader />
        <main className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link to="/" className="text-primary hover:underline">
            Back to Shop
          </Link>
        </main>
        <ShopFooter />
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const canAddToCart = isAvailable && (!product.sizesRequired || selectedSize);

  const handleAddToCart = () => {
    if (!isAvailable) {
      toast.info('Coming Soon', {
        description: 'This product will be available soon!',
      });
      return;
    }

    if (!canAddToCart) {
      toast.error('Please select a size');
      return;
    }

    addItem(product, quantity, selectedSize || undefined);
    toast.success('Added to cart', {
      description: `${product.name}${selectedSize ? ` (Size: ${selectedSize})` : ''} x ${quantity}`,
    });
  };

  const handleToggleWishlist = () => {
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

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader />

      <main>
        {/* Breadcrumb */}
        <div className="border-b border-border">
          <div className="container py-4">
            <nav className="flex items-center gap-2 text-sm flex-wrap">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                Shop
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Link
                to={`/category/${product.category}`}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {category?.name}
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {product.name}
              </span>
            </nav>
          </div>
        </div>

        {/* Product Content */}
        <div className="container py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Images */}
            <div className="space-y-4">
              {/* Main Image - Use contain for eBook to show full cover */}
              <div className={`rounded-2xl overflow-hidden bg-secondary ${product.type === 'ebook' ? 'aspect-[3/4]' : 'aspect-square'}`}>
                <img
                  src={product.images?.length > 0 ? product.images[selectedImage] : product.image}
                  alt={product.name}
                  className={`w-full h-full ${product.type === 'ebook' ? 'object-contain' : 'object-cover'}`}
                />
              </div>

              {/* Thumbnails - only show if multiple images exist */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-3">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImage === idx ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              {/* Badge */}
              {product.badge && (
                <Badge className="mb-4 bg-primary text-primary-foreground">
                  {product.badge}
                </Badge>
              )}

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {product.name}
              </h1>

              {/* Short Description */}
              <p className="text-muted-foreground mb-4">{product.shortDescription}</p>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(product.rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-muted text-muted'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium">{product.rating}</span>
                <span className="text-muted-foreground">({product.reviewCount} reviews)</span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-bold text-foreground">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <>
                    <span className="text-xl text-muted-foreground line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                    <Badge variant="destructive">-{discount}%</Badge>
                  </>
                )}
              </div>

              <Separator className="my-6" />

              {/* Size Selector */}
              {product.sizesRequired && product.sizes && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">
                      Size {product.type === 'footwear' ? '(UK)' : ''}
                    </span>
                    {!selectedSize && (
                      <span className="text-sm text-destructive">Required</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[48px] h-12 px-4 rounded-lg border-2 font-medium transition-all ${
                          selectedSize === size
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:border-primary'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Specs (for electronics) */}
              {product.specs && (
                <div className="mb-6">
                  <span className="font-medium block mb-3">Specifications</span>
                  <div className="bg-secondary rounded-lg p-4 space-y-2">
                    {Object.entries(product.specs).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <span className="font-medium block mb-3">Quantity</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium text-lg">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Add to Cart */}
              <div className="flex gap-3 mb-6">
                <Button
                  size="lg"
                  className="flex-1 gap-2"
                  onClick={handleAddToCart}
                  disabled={!canAddToCart}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleToggleWishlist}
                  className={isWishlisted ? 'bg-destructive/10 border-destructive/50 hover:bg-destructive/20' : ''}
                >
                  <Heart className={`h-5 w-5 transition-colors ${isWishlisted ? 'fill-destructive text-destructive' : ''}`} />
                </Button>
                <Button variant="outline" size="lg">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">In Stock</span>
              </div>

              <Separator className="my-6" />

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-3">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Digital Product Notice */}
              {product.type === 'ebook' && (
                <div className="mt-6 p-4 bg-atract-blue-light rounded-lg">
                  <p className="text-sm text-foreground">
                    <strong>Digital Product:</strong> This eBook will be delivered to your email immediately after purchase.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ShopFooter />
    </div>
  );
};

export default ProductDetail;
