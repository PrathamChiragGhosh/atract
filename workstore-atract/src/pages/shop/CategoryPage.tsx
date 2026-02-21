import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import ShopHeader from '@/components/shop/ShopHeader';
import ShopFooter from '@/components/shop/ShopFooter';
import ProductCard from '@/components/shop/ProductCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useProducts } from '@/context/ProductContext';

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getCategoryBySlug, getProductsByCategory, getProductsBySubcategory } = useProducts();
  const [sortBy, setSortBy] = useState('featured');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<string | null>(null);

  const category = slug ? getCategoryBySlug(slug) : undefined;

  const products = useMemo(() => {
    if (!slug) return [];
    
    let filtered = selectedSubcategory
      ? getProductsBySubcategory(slug, selectedSubcategory)
      : getProductsByCategory(slug);

    // Price filter
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number);
      filtered = filtered.filter(p => {
        if (max) return p.price >= min && p.price <= max;
        return p.price >= min;
      });
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        return [...filtered].sort((a, b) => a.price - b.price);
      case 'price-high':
        return [...filtered].sort((a, b) => b.price - a.price);
      case 'rating':
        return [...filtered].sort((a, b) => b.rating - a.rating);
      default:
        return filtered;
    }
  }, [slug, selectedSubcategory, priceRange, sortBy, getProductsByCategory, getProductsBySubcategory]);

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <ShopHeader />
        <main className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
          <Link to="/" className="text-primary hover:underline">
            Back to Shop
          </Link>
        </main>
        <ShopFooter />
      </div>
    );
  }

  const priceRanges = [
    { label: 'Under ₹1,000', value: '0-1000' },
    { label: '₹1,000 - ₹5,000', value: '1000-5000' },
    { label: '₹5,000 - ₹15,000', value: '5000-15000' },
    { label: '₹15,000 - ₹50,000', value: '15000-50000' },
    { label: 'Above ₹50,000', value: '50000-' },
  ];

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Subcategories */}
      <div>
        <h3 className="font-semibold mb-3">Subcategories</h3>
        <div className="space-y-2">
          <button
            onClick={() => setSelectedSubcategory(null)}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              !selectedSubcategory ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
            }`}
          >
            All Products
          </button>
          {category.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubcategory(sub.slug)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedSubcategory === sub.slug
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold mb-3">Price Range</h3>
        <div className="space-y-2">
          <button
            onClick={() => setPriceRange(null)}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              !priceRange ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
            }`}
          >
            All Prices
          </button>
          {priceRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setPriceRange(range.value)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                priceRange === range.value
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader />

      <main>
        {/* Breadcrumb */}
        <div className="border-b border-border">
          <div className="container py-4">
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                Shop
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{category.name}</span>
              {selectedSubcategory && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground font-medium">
                    {category.subcategories.find(s => s.slug === selectedSubcategory)?.name}
                  </span>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Header */}
        <div className="container py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{category.name}</h1>
              <p className="text-muted-foreground mt-1">
                {products.length} {products.length === 1 ? 'product' : 'products'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile Filter */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedSubcategory || priceRange) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedSubcategory && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedSubcategory(null)}>
                  {category.subcategories.find(s => s.slug === selectedSubcategory)?.name}
                  <span className="ml-1">×</span>
                </Badge>
              )}
              {priceRange && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setPriceRange(null)}>
                  {priceRanges.find(r => r.value === priceRange)?.label}
                  <span className="ml-1">×</span>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="container pb-16">
          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <FilterContent />
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              {products.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">No products found</p>
                  <Button variant="outline" onClick={() => {
                    setSelectedSubcategory(null);
                    setPriceRange(null);
                  }}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
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

export default CategoryPage;
