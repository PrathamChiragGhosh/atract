import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/context/AdminContext';
import { useProducts } from '@/context/ProductContext';
import { Product } from '@/data/products';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import ProductTable from '@/components/admin/ProductTable';
import ProductFormModal from '@/components/admin/ProductFormModal';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { isAuthenticated } = useAdmin();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = (productId: string) => {
    deleteProduct(productId);
    toast({
      title: 'Product Deleted',
      description: 'The product has been removed successfully.',
    });
  };

  const handleSaveProduct = (productData: Partial<Product> & { isActive: boolean }) => {
    if (editingProduct) {
      // Update existing
      updateProduct({ ...editingProduct, ...productData } as Product);
      toast({
        title: 'Product Updated',
        description: 'The product has been updated successfully.',
      });
    } else {
      // Add new
      const defaultImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';
      const newProduct: Product = {
        id: productData.id || `prod-${Date.now()}`,
        name: productData.name || '',
        price: productData.price || 0,
        originalPrice: productData.originalPrice,
        description: productData.description || '',
        shortDescription: productData.description || '',
        image: productData.image || defaultImage,
        images: productData.images || [productData.image || defaultImage],
        category: productData.category || 'electronics',
        subcategory: productData.subcategory || '',
        type: productData.type || 'electronics',
        sizesRequired: productData.sizesRequired || false,
        sizes: productData.sizes,
        specs: productData.specs,
        rating: 4.5,
        reviewCount: 0,
        inStock: true,
      };
      addProduct(newProduct);
      toast({
        title: 'Product Added',
        description: 'The new product has been created successfully.',
      });
    }
  };

  const getCategoryTitle = () => {
    const titles: Record<string, string> = {
      all: 'All Products',
      electronics: 'Electronics',
      'fashion-men': 'Fashion – Men',
      'fashion-women': 'Fashion – Women',
      ebooks: 'eBooks',
    };
    return titles[selectedCategory] || 'Products';
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="flex">
        <AdminSidebar
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        <main className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">{getCategoryTitle()}</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <Button onClick={handleAddProduct}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>

          <ProductTable
            products={filteredProducts}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
          />
        </main>
      </div>

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
        defaultCategory={selectedCategory}
      />
    </div>
  );
};

export default AdminDashboard;
