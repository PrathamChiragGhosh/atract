import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Category } from '@/data/products';

interface CategoryCardProps {
  category: Category;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  return (
    <Link
      to={`/category/${category.slug}`}
      className="group relative block overflow-hidden rounded-2xl aspect-[4/3] bg-secondary"
    >
      {/* Background Image */}
      <img
        src={category.image}
        alt={category.name}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <h3 className="text-xl font-bold text-background mb-1 group-hover:text-primary transition-colors">
          {category.name}
        </h3>
        <p className="text-sm text-background/80 mb-3 line-clamp-2">
          {category.description}
        </p>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <span>Shop Now</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
