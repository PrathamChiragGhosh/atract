import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Laptop, BookOpen, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FEATURED_PRODUCT_ID, useProducts } from '@/context/ProductContext';

const HeroSection: React.FC = () => {
  const { getProductById } = useProducts();
  const featuredProduct = getProductById(FEATURED_PRODUCT_ID);

  return (
    <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container relative py-12 md:py-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content - Main Hero Message */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Your Career, Simplified</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              Everything You Need for Your{' '}
              <span className="relative inline-block">
                Professional
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 6C50 2 150 2 198 6"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="opacity-40"
                  />
                </svg>
              </span>{' '}
              Journey
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-primary-foreground/80 mb-8 max-w-xl leading-relaxed">
              From tech essentials to interview prep — shop smart, work better, grow faster. One place for fashion, electronics, and career resources.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link to="/category/electronics">
                <Button size="lg" variant="secondary" className="gap-2 font-semibold px-6">
                  <Laptop className="h-5 w-5" />
                  Browse Essentials
                </Button>
              </Link>
              <Link to="/category/ebooks">
                <Button size="lg" className="gap-2 font-semibold px-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <BookOpen className="h-5 w-5" />
                  Explore eBooks
                </Button>
              </Link>
            </div>
          </div>

          {/* Right - Featured eBook Card */}
          {featuredProduct && (
            <div className="flex justify-center lg:justify-end">
              <Link 
                to={`/product/${FEATURED_PRODUCT_ID}`}
                className="group relative block"
              >
                <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl w-72">
                  {/* Book Image - Uses product image from admin */}
                  <div className="relative h-64 bg-secondary overflow-hidden">
                    <img
                      src={featuredProduct.image}
                      alt={featuredProduct.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-4 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">eBook</Badge>
                      <span className="text-xs text-muted-foreground">Instant Download</span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground leading-tight mb-1 group-hover:text-primary transition-colors">
                      {featuredProduct.name}
                    </h3>

                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {featuredProduct.shortDescription}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {featuredProduct.rating} ({featuredProduct.reviewCount?.toLocaleString()})
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">₹{featuredProduct.price}</span>
                        {featuredProduct.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            ₹{featuredProduct.originalPrice}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-primary font-medium text-xs group-hover:gap-2 transition-all">
                        Get Now
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
