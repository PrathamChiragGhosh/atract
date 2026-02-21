export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  shortDescription: string;
  image: string;
  images: string[];
  category: string;
  subcategory: string;
  type: 'clothing' | 'footwear' | 'accessory' | 'electronics' | 'ebook';
  sizesRequired: boolean;
  sizes?: string[];
  specs?: Record<string, string>;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  badge?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

export const categories: Category[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Professional gadgets and devices for your career',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
    subcategories: [
      { id: 'mobiles', name: 'Mobiles', slug: 'mobiles' },
      { id: 'laptops', name: 'Laptops', slug: 'laptops' },
    ],
  },
  {
    id: 'fashion-men',
    name: 'Fashion – Men',
    slug: 'fashion-men',
    description: 'Professional attire for the modern professional',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=300&fit=crop',
    subcategories: [
      { id: 'office-wear-men', name: 'Office Wear', slug: 'office-wear' },
      { id: 'interview-wear-men', name: 'Interview Wear', slug: 'interview-wear' },
      { id: 'cultural-day-men', name: 'Cultural Day', slug: 'cultural-day' },
      { id: 'watches', name: 'Watches', slug: 'watches' },
      { id: 'sneakers', name: 'Sneakers', slug: 'sneakers' },
      { id: 'belts', name: 'Belts', slug: 'belts' },
      { id: 'ties', name: 'Ties', slug: 'ties' },
      { id: 'blazers', name: 'Blazers', slug: 'blazers' },
    ],
  },
  {
    id: 'fashion-women',
    name: 'Fashion – Women',
    slug: 'fashion-women',
    description: 'Elegant professional wear for women',
    image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&h=300&fit=crop',
    subcategories: [
      { id: 'office-wear-women', name: 'Office Wear', slug: 'office-wear' },
      { id: 'interview-wear-women', name: 'Interview Wear', slug: 'interview-wear' },
      { id: 'cultural-day-women', name: 'Cultural Day', slug: 'cultural-day' },
      { id: 'tote-bags', name: 'Tote Bags', slug: 'tote-bags' },
      { id: 'heels', name: 'Heels', slug: 'heels' },
      { id: 'boots', name: 'Boots', slug: 'boots' },
      { id: 'scarves', name: 'Scarves', slug: 'scarves' },
    ],
  },
  {
    id: 'ebooks',
    name: 'Professional eBooks',
    slug: 'ebooks',
    description: 'Career resources and guides for success',
    image: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400&h=300&fit=crop',
    subcategories: [
      { id: 'interview-prep', name: 'Interview Preparation', slug: 'interview-preparation' },
      { id: 'resume-ats', name: 'Resume & ATS Optimization', slug: 'resume-ats' },
      { id: 'career-ai', name: 'Career Growth in AI Era', slug: 'career-ai' },
    ],
  },
];

export const products: Product[] = [
  // Electronics - Mobiles
  {
    id: 'mob-001',
    name: 'iPhone 15 Pro Max',
    price: 134900,
    originalPrice: 159900,
    description: 'The most powerful iPhone ever. A17 Pro chip, titanium design, and the most advanced camera system. Perfect for professionals who need reliability and performance.',
    shortDescription: 'Premium smartphone for professionals',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=800&fit=crop',
    ],
    category: 'electronics',
    subcategory: 'mobiles',
    type: 'electronics',
    sizesRequired: false,
    specs: {
      'Display': '6.7" Super Retina XDR',
      'Chip': 'A17 Pro',
      'Storage': '256GB',
      'Camera': '48MP Main',
      'Battery': 'All-day battery life',
    },
    rating: 4.8,
    reviewCount: 2341,
    inStock: true,
    badge: 'Best Seller',
  },
  {
    id: 'mob-002',
    name: 'Samsung Galaxy S24 Ultra',
    price: 129999,
    originalPrice: 144999,
    description: 'Galaxy AI is here. Built-in intelligence that transforms the way you work and create. S Pen included for note-taking in meetings.',
    shortDescription: 'AI-powered productivity device',
    image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=800&fit=crop',
    ],
    category: 'electronics',
    subcategory: 'mobiles',
    type: 'electronics',
    sizesRequired: false,
    specs: {
      'Display': '6.8" Dynamic AMOLED 2X',
      'Chip': 'Snapdragon 8 Gen 3',
      'Storage': '256GB',
      'Camera': '200MP Main',
      'S Pen': 'Included',
    },
    rating: 4.7,
    reviewCount: 1892,
    inStock: true,
  },
  // Electronics - Laptops
  {
    id: 'lap-001',
    name: 'MacBook Pro 16" M3 Pro',
    price: 249900,
    originalPrice: 269900,
    description: 'Supercharged by M3 Pro chip for exceptional performance. Perfect for developers, designers, and power users who demand the best.',
    shortDescription: 'Professional laptop for power users',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop',
    ],
    category: 'electronics',
    subcategory: 'laptops',
    type: 'electronics',
    sizesRequired: false,
    specs: {
      'Display': '16.2" Liquid Retina XDR',
      'Chip': 'Apple M3 Pro',
      'Memory': '18GB Unified',
      'Storage': '512GB SSD',
      'Battery': 'Up to 22 hours',
    },
    rating: 4.9,
    reviewCount: 876,
    inStock: true,
    badge: 'Premium',
  },
  {
    id: 'lap-002',
    name: 'ThinkPad X1 Carbon Gen 11',
    price: 175999,
    description: 'Legendary business laptop. Ultra-light, ultra-durable with enterprise security features. Ideal for corporate professionals.',
    shortDescription: 'Enterprise-grade business laptop',
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=800&fit=crop',
    ],
    category: 'electronics',
    subcategory: 'laptops',
    type: 'electronics',
    sizesRequired: false,
    specs: {
      'Display': '14" 2.8K OLED',
      'Processor': 'Intel Core i7-1365U',
      'Memory': '16GB LPDDR5',
      'Storage': '512GB SSD',
      'Weight': '1.12 kg',
    },
    rating: 4.6,
    reviewCount: 543,
    inStock: true,
  },
  // Fashion Men - Interview Wear
  {
    id: 'men-001',
    name: 'Classic Navy Suit',
    price: 24999,
    originalPrice: 34999,
    description: 'Make a lasting first impression with this tailored navy suit. Premium wool blend fabric with a modern slim fit. Perfect for interviews and formal meetings.',
    shortDescription: 'Interview-ready professional suit',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop',
    ],
    category: 'fashion-men',
    subcategory: 'interview-wear',
    type: 'clothing',
    sizesRequired: true,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    rating: 4.7,
    reviewCount: 234,
    inStock: true,
    badge: 'Interview Ready',
  },
  {
    id: 'men-002',
    name: 'White Formal Shirt',
    price: 2999,
    originalPrice: 3999,
    description: 'Crisp white formal shirt in premium cotton. Wrinkle-resistant finish keeps you looking sharp throughout the day.',
    shortDescription: 'Essential formal shirt',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=800&fit=crop',
    ],
    category: 'fashion-men',
    subcategory: 'office-wear',
    type: 'clothing',
    sizesRequired: true,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    rating: 4.5,
    reviewCount: 567,
    inStock: true,
  },
  {
    id: 'men-003',
    name: 'Classic Oxford Shoes',
    price: 8999,
    originalPrice: 11999,
    description: 'Timeless Oxford shoes in genuine leather. Comfortable cushioned insole for all-day wear. The perfect finishing touch for formal attire.',
    shortDescription: 'Premium leather formal shoes',
    image: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&h=800&fit=crop',
    ],
    category: 'fashion-men',
    subcategory: 'sneakers',
    type: 'footwear',
    sizesRequired: true,
    sizes: ['6', '7', '8', '9', '10', '11', '12'],
    rating: 4.6,
    reviewCount: 321,
    inStock: true,
  },
  {
    id: 'men-004',
    name: 'Silk Tie - Navy Blue',
    price: 1499,
    description: 'Premium silk tie in classic navy blue. Adds sophistication to any professional outfit.',
    shortDescription: 'Classic silk tie',
    image: 'https://images.unsplash.com/photo-1589756823695-278bc923f962?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1589756823695-278bc923f962?w=800&h=800&fit=crop',
    ],
    category: 'fashion-men',
    subcategory: 'ties',
    type: 'accessory',
    sizesRequired: false,
    rating: 4.4,
    reviewCount: 189,
    inStock: true,
  },
  {
    id: 'men-005',
    name: 'Professional Blazer',
    price: 12999,
    originalPrice: 16999,
    description: 'Versatile blazer that works for both casual Fridays and important presentations. Tailored fit with modern lapels.',
    shortDescription: 'Versatile professional blazer',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=800&fit=crop',
    ],
    category: 'fashion-men',
    subcategory: 'blazers',
    type: 'clothing',
    sizesRequired: true,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    rating: 4.7,
    reviewCount: 412,
    inStock: true,
  },
  {
    id: 'men-006',
    name: 'Executive Watch - Silver',
    price: 15999,
    originalPrice: 19999,
    description: 'Elegant timepiece that commands respect. Stainless steel case with sapphire crystal. Water-resistant to 50m.',
    shortDescription: 'Premium executive watch',
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&h=800&fit=crop',
    ],
    category: 'fashion-men',
    subcategory: 'watches',
    type: 'accessory',
    sizesRequired: false,
    rating: 4.8,
    reviewCount: 287,
    inStock: true,
    badge: 'Premium',
  },
  {
    id: 'men-007',
    name: 'Leather Belt - Brown',
    price: 2499,
    description: 'Full-grain leather belt with classic buckle. The perfect accessory to complete your professional look.',
    shortDescription: 'Classic leather belt',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop',
    ],
    category: 'fashion-men',
    subcategory: 'belts',
    type: 'accessory',
    sizesRequired: false,
    rating: 4.5,
    reviewCount: 198,
    inStock: true,
  },
  // Fashion Women
  {
    id: 'women-001',
    name: 'Power Suit - Charcoal',
    price: 22999,
    originalPrice: 29999,
    description: 'Command the room with this perfectly tailored power suit. Modern silhouette with feminine details. Ideal for interviews and presentations.',
    shortDescription: 'Professional power suit',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=800&fit=crop',
    ],
    category: 'fashion-women',
    subcategory: 'interview-wear',
    type: 'clothing',
    sizesRequired: true,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    rating: 4.8,
    reviewCount: 345,
    inStock: true,
    badge: 'Interview Ready',
  },
  {
    id: 'women-002',
    name: 'Silk Blouse - Ivory',
    price: 4999,
    description: 'Elegant silk blouse that transitions seamlessly from office to after-work events. Breathable and comfortable.',
    shortDescription: 'Elegant silk blouse',
    image: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&h=800&fit=crop',
    ],
    category: 'fashion-women',
    subcategory: 'office-wear',
    type: 'clothing',
    sizesRequired: true,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    rating: 4.6,
    reviewCount: 234,
    inStock: true,
  },
  {
    id: 'women-003',
    name: 'Professional Heels - Black',
    price: 6999,
    originalPrice: 8999,
    description: 'Comfortable yet elegant heels for the professional woman. 3-inch heel with cushioned insole for all-day comfort.',
    shortDescription: 'Comfortable professional heels',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&h=800&fit=crop',
    ],
    category: 'fashion-women',
    subcategory: 'heels',
    type: 'footwear',
    sizesRequired: true,
    sizes: ['5', '6', '7', '8', '9', '10'],
    rating: 4.5,
    reviewCount: 412,
    inStock: true,
  },
  {
    id: 'women-004',
    name: 'Leather Tote Bag',
    price: 8999,
    originalPrice: 11999,
    description: 'Spacious leather tote that fits your laptop, documents, and essentials. Professional elegance meets functionality.',
    shortDescription: 'Elegant work tote',
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=800&fit=crop',
    ],
    category: 'fashion-women',
    subcategory: 'tote-bags',
    type: 'accessory',
    sizesRequired: false,
    rating: 4.7,
    reviewCount: 289,
    inStock: true,
  },
  {
    id: 'women-005',
    name: 'Silk Scarf - Floral',
    price: 2999,
    description: 'Versatile silk scarf that adds a touch of elegance to any outfit. Can be worn as a neck tie, headband, or bag accessory.',
    shortDescription: 'Versatile silk scarf',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=800&fit=crop',
    ],
    category: 'fashion-women',
    subcategory: 'scarves',
    type: 'accessory',
    sizesRequired: false,
    rating: 4.4,
    reviewCount: 156,
    inStock: true,
  },
  {
    id: 'women-006',
    name: 'Ankle Boots - Cognac',
    price: 9999,
    description: 'Stylish ankle boots in rich cognac leather. Perfect for transitional seasons and adds personality to office attire.',
    shortDescription: 'Stylish leather ankle boots',
    image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&h=800&fit=crop',
    ],
    category: 'fashion-women',
    subcategory: 'boots',
    type: 'footwear',
    sizesRequired: true,
    sizes: ['5', '6', '7', '8', '9', '10'],
    rating: 4.6,
    reviewCount: 198,
    inStock: true,
  },
  // eBooks
  {
    id: 'ebook-001',
    name: 'Ace Your Interview',
    price: 499,
    originalPrice: 999,
    description: 'Comprehensive guide to mastering job interviews. Covers behavioral questions, technical interviews, salary negotiation, and follow-up strategies. Written by HR professionals with 20+ years of experience.',
    shortDescription: 'Complete interview preparation guide',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&h=800&fit=crop',
    ],
    category: 'ebooks',
    subcategory: 'interview-preparation',
    type: 'ebook',
    sizesRequired: false,
    rating: 4.9,
    reviewCount: 1234,
    inStock: true,
    badge: 'Best Seller',
  },
  {
    id: 'ebook-002',
    name: 'Resume That Gets Noticed',
    price: 399,
    originalPrice: 799,
    description: 'Learn how to craft an ATS-optimized resume that stands out. Includes templates, keyword strategies, and real examples from successful candidates.',
    shortDescription: 'ATS-optimized resume guide',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=800&fit=crop',
    ],
    category: 'ebooks',
    subcategory: 'resume-ats',
    type: 'ebook',
    sizesRequired: false,
    rating: 4.7,
    reviewCount: 892,
    inStock: true,
  },
  {
    id: 'ebook-003',
    name: 'Future-Proof Your Career',
    price: 699,
    description: 'Navigate the AI revolution with confidence. Learn which skills to develop, how to leverage AI tools, and position yourself for emerging opportunities.',
    shortDescription: 'Career guide for the AI era',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=800&fit=crop',
    ],
    category: 'ebooks',
    subcategory: 'career-ai',
    type: 'ebook',
    sizesRequired: false,
    rating: 4.8,
    reviewCount: 567,
    inStock: true,
    badge: 'New',
  },
  {
    id: 'ebook-004',
    name: 'LinkedIn Mastery',
    price: 349,
    description: 'Build a powerful LinkedIn presence that attracts recruiters. Profile optimization, networking strategies, and content creation tips.',
    shortDescription: 'LinkedIn optimization guide',
    image: 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=800&h=800&fit=crop',
    ],
    category: 'ebooks',
    subcategory: 'resume-ats',
    type: 'ebook',
    sizesRequired: false,
    rating: 4.6,
    reviewCount: 445,
    inStock: true,
  },
];

export const featuredCollections = [
  {
    id: 'interview-ready',
    name: 'Interview Ready',
    description: 'First impressions matter — dress to impress',
    productIds: ['men-001', 'women-001', 'men-004', 'men-006'],
  },
  {
    id: 'office-ready',
    name: 'Office Ready',
    description: 'Everyday work essentials for the modern professional',
    productIds: ['men-002', 'women-002', 'men-005', 'women-004'],
  },
  {
    id: 'work-tech',
    name: 'Work Tech Essentials',
    description: 'Laptops, mobiles, and gadgets for productivity',
    productIds: ['lap-001', 'lap-002', 'mob-001', 'mob-002'],
  },
  {
    id: 'learn-grow',
    name: 'Learn & Grow',
    description: 'Knowledge that moves your career forward',
    productIds: ['ebook-001', 'ebook-002', 'ebook-003', 'ebook-004'],
  },
];

export const getProductById = (id: string): Product | undefined => {
  return products.find(p => p.id === id);
};

export const getProductsByCategory = (categorySlug: string): Product[] => {
  return products.filter(p => p.category === categorySlug);
};

export const getProductsBySubcategory = (categorySlug: string, subcategorySlug: string): Product[] => {
  return products.filter(p => p.category === categorySlug && p.subcategory === subcategorySlug);
};

export const getCategoryBySlug = (slug: string): Category | undefined => {
  return categories.find(c => c.slug === slug);
};

export const getFeaturedProducts = (): Product[] => {
  return products.filter(p => p.badge);
};

export const getCollectionProducts = (collectionId: string): Product[] => {
  const collection = featuredCollections.find(c => c.id === collectionId);
  if (!collection) return [];
  return products.filter(p => collection.productIds.includes(p.id));
};
