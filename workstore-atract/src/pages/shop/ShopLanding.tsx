import React from 'react';
import ShopHeader from '@/components/shop/ShopHeader';
import ShopFooter from '@/components/shop/ShopFooter';
import HeroSection from '@/components/shop/HeroSection';
import CategoryCard from '@/components/shop/CategoryCard';
import FeaturedCollections from '@/components/shop/FeaturedCollections';
import { categories } from '@/data/products';

const ShopLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <ShopHeader />
      
      <main>
        {/* Hero */}
        <HeroSection />

        {/* Categories */}
        <section className="py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Shop by Category
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Everything you need for your professional journey, carefully curated for career success.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </div>
        </section>

        {/* Featured Collections */}
        <FeaturedCollections />

        {/* CTA Banner */}
        <section className="py-16 bg-atract-blue-light">
          <div className="container text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Shop Smart. Work Better. Grow Faster.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              The one place professionals shop for work, preparation, and growth.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/category/electronics"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-atract-blue-dark transition-colors"
              >
                Browse Tech
              </a>
              <a
                href="/category/ebooks"
                className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary font-medium rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Explore eBooks
              </a>
            </div>
          </div>
        </section>
      </main>

      <ShopFooter />
    </div>
  );
};

export default ShopLanding;
