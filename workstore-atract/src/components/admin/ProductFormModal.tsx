import { useState, useEffect, useRef } from 'react';
import { Product } from '@/data/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Upload, Image as ImageIcon } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product> & { isActive: boolean; specs?: Record<string, string> }) => void;
  product?: Product | null;
  defaultCategory?: string;
}

const categories = [
  { id: 'electronics', name: 'Electronics' },
  { id: 'fashion-men', name: 'Fashion – Men' },
  { id: 'fashion-women', name: 'Fashion – Women' },
  { id: 'ebooks', name: 'eBooks' },
];

const subcategories: Record<string, string[]> = {
  electronics: ['Mobiles', 'Laptops', 'Tablets', 'Audio'],
  'fashion-men': ['Office Wear', 'Interview Wear', 'Cultural Day', 'Accessories'],
  'fashion-women': ['Office Wear', 'Interview Wear', 'Cultural Day', 'Accessories'],
  ebooks: ['Interview Prep', 'Resume & ATS', 'Career Growth'],
};

const productTypes = [
  { id: 'clothing', name: 'Clothing' },
  { id: 'footwear', name: 'Footwear' },
  { id: 'accessory', name: 'Accessory' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'ebook', name: 'eBook' },
];

const clothingSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const shoeSizes = ['6', '7', '8', '9', '10', '11', '12'];

const ProductFormModal = ({
  isOpen,
  onClose,
  onSave,
  product,
  defaultCategory = 'electronics',
}: ProductFormModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    category: defaultCategory,
    subcategory: '',
    type: 'electronics' as string,
    price: '',
    discountPrice: '',
    shortDescription: '',
    fullDescription: '',
    isActive: true,
    // Clothing
    sizes: [] as string[],
    material: '',
    fit: '',
    // Footwear
    shoeSizes: [] as string[],
    // Accessories
    brand: '',
    color: '',
    // Electronics
    specs: [{ key: '', value: '' }] as { key: string; value: string }[],
    // eBooks
    format: '',
    pages: '',
    language: '',
    // Images
    images: [] as string[],
  });

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        subcategory: product.subcategory || '',
        type: product.type,
        price: product.price.toString(),
        discountPrice: product.originalPrice ? product.originalPrice.toString() : '',
        shortDescription: product.description,
        fullDescription: product.description,
        isActive: true,
        sizes: product.sizes || [],
        material: '',
        fit: '',
        shoeSizes: product.sizes?.filter((s) => !isNaN(Number(s))) || [],
        brand: '',
        color: '',
        specs: product.specs
          ? Object.entries(product.specs).map(([key, value]) => ({ key, value }))
          : [{ key: '', value: '' }],
        format: '',
        pages: '',
        language: '',
        images: product.image ? [product.image] : [],
      });
    } else {
      setFormData({
        name: '',
        category: defaultCategory !== 'all' ? defaultCategory : 'electronics',
        subcategory: '',
        type: 'electronics',
        price: '',
        discountPrice: '',
        shortDescription: '',
        fullDescription: '',
        isActive: true,
        sizes: [],
        material: '',
        fit: '',
        shoeSizes: [],
        brand: '',
        color: '',
        specs: [{ key: '', value: '' }],
        format: '',
        pages: '',
        language: '',
        images: [],
      });
    }
  }, [product, defaultCategory, isOpen]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, result],
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSizeToggle = (size: string, isShoe: boolean = false) => {
    if (isShoe) {
      setFormData((prev) => ({
        ...prev,
        shoeSizes: prev.shoeSizes.includes(size)
          ? prev.shoeSizes.filter((s) => s !== size)
          : [...prev.shoeSizes, size],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        sizes: prev.sizes.includes(size)
          ? prev.sizes.filter((s) => s !== size)
          : [...prev.sizes, size],
      }));
    }
  };

  const addSpecField = () => {
    setFormData((prev) => ({
      ...prev,
      specs: [...prev.specs, { key: '', value: '' }],
    }));
  };

  const removeSpecField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specs: prev.specs.filter((_, i) => i !== index),
    }));
  };

  const updateSpec = (index: number, field: 'key' | 'value', value: string) => {
    setFormData((prev) => ({
      ...prev,
      specs: prev.specs.map((spec, i) =>
        i === index ? { ...spec, [field]: value } : spec
      ),
    }));
  };

  const handleSubmit = () => {
    const specsObject: Record<string, string> = {};
    formData.specs.forEach((spec) => {
      if (spec.key && spec.value) {
        specsObject[spec.key] = spec.value;
      }
    });

    onSave({
      id: product?.id || `prod-${Date.now()}`,
      name: formData.name,
      category: formData.category,
      subcategory: formData.subcategory,
      type: formData.type as Product['type'],
      price: Number(formData.price),
      originalPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
      description: formData.shortDescription,
      image: formData.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      sizesRequired: formData.type === 'clothing' || formData.type === 'footwear',
      sizes:
        formData.type === 'clothing'
          ? formData.sizes
          : formData.type === 'footwear'
          ? formData.shoeSizes
          : undefined,
      specs: formData.type === 'electronics' ? specsObject : undefined,
      isActive: formData.isActive,
    });
    onClose();
  };

  const renderConditionalFields = () => {
    switch (formData.type) {
      case 'clothing':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Clothing Details</h4>
            <div className="space-y-2">
              <Label>Available Sizes</Label>
              <div className="flex flex-wrap gap-2">
                {clothingSizes.map((size) => (
                  <label
                    key={size}
                    className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-muted"
                  >
                    <Checkbox
                      checked={formData.sizes.includes(size)}
                      onCheckedChange={() => handleSizeToggle(size)}
                    />
                    <span className="text-sm">{size}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Material</Label>
                <Input
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  placeholder="e.g., Cotton, Polyester"
                />
              </div>
              <div className="space-y-2">
                <Label>Fit</Label>
                <Select
                  value={formData.fit}
                  onValueChange={(value) => setFormData({ ...formData, fit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slim">Slim</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="relaxed">Relaxed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'footwear':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Footwear Details</h4>
            <div className="space-y-2">
              <Label>Available Sizes (UK)</Label>
              <div className="flex flex-wrap gap-2">
                {shoeSizes.map((size) => (
                  <label
                    key={size}
                    className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-muted"
                  >
                    <Checkbox
                      checked={formData.shoeSizes.includes(size)}
                      onCheckedChange={() => handleSizeToggle(size, true)}
                    />
                    <span className="text-sm">{size}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Input
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="e.g., Leather, Canvas"
              />
            </div>
          </div>
        );

      case 'accessory':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Accessory Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand (Optional)</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g., Tommy Hilfiger"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g., Black, Brown"
                />
              </div>
            </div>
          </div>
        );

      case 'electronics':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Electronics Details</h4>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Apple, Samsung"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Specifications</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSpecField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Spec
                </Button>
              </div>
              <div className="space-y-2">
                {formData.specs.map((spec, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Key (e.g., RAM)"
                      value={spec.key}
                      onChange={(e) => updateSpec(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value (e.g., 8GB)"
                      value={spec.value}
                      onChange={(e) => updateSpec(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    {formData.specs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSpecField(index)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'ebook':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">eBook Details</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={formData.format}
                  onValueChange={(value) => setFormData({ ...formData, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="epub">EPUB</SelectItem>
                    <SelectItem value="both">PDF + EPUB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Number of Pages</Label>
                <Input
                  type="number"
                  value={formData.pages}
                  onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                  placeholder="e.g., 150"
                />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                    <SelectItem value="bilingual">Bilingual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the product details below.'
              : 'Fill in the details to create a new product.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value, subcategory: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select
                  value={formData.subcategory}
                  onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                  disabled={!formData.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories[formData.category]?.map((sub) => (
                      <SelectItem key={sub} value={sub.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {productTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="e.g., 1999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPrice">Original Price (₹)</Label>
                <Input
                  id="discountPrice"
                  type="number"
                  value={formData.discountPrice}
                  onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                  placeholder="e.g., 2499 (for discount)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product Images</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              
              {/* Image Previews */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={img}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                          Main
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                {formData.images.length === 0 ? (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop images, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports JPG, PNG, WebP
                    </p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">
                      Click or drag to add more images
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description *</Label>
              <Textarea
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="Brief product description"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDescription">Full Description</Label>
              <Textarea
                id="fullDescription"
                value={formData.fullDescription}
                onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                placeholder="Detailed product description"
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <Label htmlFor="isActive">Product Status</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle to make product active or inactive
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          {/* Conditional Fields */}
          {renderConditionalFields()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name || !formData.price}>
            {isEditing ? 'Save Changes' : 'Add Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormModal;
