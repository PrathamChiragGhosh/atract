import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Building2, Laptop, BookOpen } from 'lucide-react';
import { featuredCollections, getCollectionProducts } from '@/data/products';
import ProductCard from './ProductCard';

const collectionIcons: Record<string, React.ReactNode> = {
  'interview-ready': <Briefcase className="h-6 w-6" />,
  'office-ready': <Building2 className="h-6 w-6" />,
  'work-tech': <Laptop className="h-6 w-6" />,
  'learn-grow': <BookOpen className="h-6 w-6" />,
};

const collectionColors: Record<string, string> = {
  'interview-ready': 'bg-primary/10 text-primary',
  'office-ready': 'bg-atract-navy/10 text-atract-navy',
  'work-tech': 'bg-atract-blue/10 text-atract-blue',
  'learn-grow': 'bg-green-500/10 text-green-600',
};

const FeaturedCollections: React.FC = () => {
  return (
    <section className="py-16 space-y-20">
      <div className="container">
        {featuredCollections.map((collection) => (
          <div key={collection.id} className="mb-16 last:mb-0">
            {/* Collection Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${collectionColors[collection.id] || 'bg-primary/10 text-primary'}`}>
                  {collectionIcons[collection.id] || <Briefcase className="h-6 w-6" />}
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    {collection.name}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {collection.description}
                  </p>
                </div>
              </div>
              <Link
                to="/"
                className="hidden sm:flex items-center gap-2 text-primary font-medium hover:underline"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {getCollectionProducts(collection.id).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Mobile View All */}
            <div className="mt-6 sm:hidden">
              <Link
                to="/"
                className="flex items-center justify-center gap-2 text-primary font-medium"
              >
                View All Products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedCollections;
