import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Heart, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import atractLogo from '@/assets/atract-logo.png';

const ShopHeader: React.FC = () => {
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  const navLinks = [
    { name: 'Electronics', href: '/category/electronics' },
    { name: 'Men', href: '/category/fashion-men' },
    { name: 'Women', href: '/category/fashion-women' },
    { name: 'eBooks', href: '/category/ebooks' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Back to Atract + Logo */}
        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3010/"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </a>
          <a
            href="http://localhost:3010/"
            className="flex items-center gap-1"
          >
            <img src={atractLogo} alt="Atract" className="h-8 w-auto rounded-md" />
            <span className="text-lg font-semibold text-primary">Shop</span>
          </a>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          {/* Desktop Search */}
          <div className="hidden md:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="w-64 pl-9 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          {/* Wishlist */}
          <Link to="/wishlist">
            <Button variant="ghost" size="icon" className="relative">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Cart */}
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile Search Expanded */}
      {isSearchOpen && (
        <div className="md:hidden border-t border-border p-4 animate-slide-down">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="w-full pl-9 bg-secondary border-0"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default ShopHeader;
