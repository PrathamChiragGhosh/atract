import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Category, categories as initialCategories, products as initialProducts } from '@/data/products';
import ebookCover from '@/assets/ebook-cover.jpg';

// The featured ebook that is currently available
export const FEATURED_PRODUCT_ID = 'resume-shortlist-ebook';

interface ProductContextType {
  products: Product[];
  categories: Category[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (categorySlug: string) => Product[];
  getProductsBySubcategory: (categorySlug: string, subcategorySlug: string) => Product[];
  getCategoryBySlug: (slug: string) => Category | undefined;
  getFeaturedProducts: () => Product[];
  isProductAvailable: (productId: string) => boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const STORAGE_KEY = 'atract-products';

// Default featured ebook product (used only if not in localStorage)
const defaultFeaturedEbook: Product = {
  id: FEATURED_PRODUCT_ID,
  name: 'Why Your Resume Never Gets Shortlisted',
  price: 299,
  originalPrice: 599,
  description: 'Discover the hidden reasons why your resume gets rejected by ATS systems and hiring managers. This comprehensive guide reveals the exact mistakes 90% of job seekers make and provides actionable strategies to fix them. Learn the insider secrets that recruiters never tell you.',
  shortDescription: 'The ultimate guide to fixing your resume and getting more interviews',
  image: ebookCover,
  images: [ebookCover],
  category: 'ebooks',
  subcategory: 'resume-ats',
  type: 'ebook',
  sizesRequired: false,
  rating: 4.9,
  reviewCount: 2847,
  inStock: true,
  badge: 'Best Seller',
};

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    // Initialize from localStorage synchronously to prevent flash
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedProducts = JSON.parse(stored) as Product[];
      // Ensure the featured ebook is always present (use stored version, not default)
      const hasFeatureEbook = parsedProducts.some(p => p.id === FEATURED_PRODUCT_ID);
      if (!hasFeatureEbook) {
        return [defaultFeaturedEbook, ...parsedProducts];
      }
      // Return products from localStorage as-is (preserves admin edits)
      return parsedProducts;
    }
    // First time: add default featured ebook + existing products
    const allProducts = [defaultFeaturedEbook, ...initialProducts];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProducts));
    return allProducts;
  });

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setProducts(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  };

  const addProduct = (product: Product) => {
    const updated = [...products, product];
    saveProducts(updated);
  };

  const updateProduct = (product: Product) => {
    const updated = products.map(p => p.id === product.id ? product : p);
    saveProducts(updated);
  };

  const deleteProduct = (productId: string) => {
    const updated = products.filter(p => p.id !== productId);
    saveProducts(updated);
  };

  const getProductById = (id: string): Product | undefined => {
    return products.find(p => p.id === id);
  };

  const getProductsByCategory = (categorySlug: string): Product[] => {
    return products.filter(p => p.category === categorySlug);
  };

  const getProductsBySubcategory = (categorySlug: string, subcategorySlug: string): Product[] => {
    return products.filter(p => p.category === categorySlug && p.subcategory === subcategorySlug);
  };

  const getCategoryBySlug = (slug: string): Category | undefined => {
    return initialCategories.find(c => c.slug === slug);
  };

  const getFeaturedProducts = (): Product[] => {
    return products.filter(p => p.badge);
  };

  const isProductAvailable = (productId: string): boolean => {
    return productId === FEATURED_PRODUCT_ID;
  };

  return (
    <ProductContext.Provider value={{
      products,
      categories: initialCategories,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductById,
      getProductsByCategory,
      getProductsBySubcategory,
      getCategoryBySlug,
      getFeaturedProducts,
      isProductAvailable,
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
