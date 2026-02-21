import { Product } from '@/data/products';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash2 } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

const ProductTable = ({ products, onEdit, onDelete }: ProductTableProps) => {
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      clothing: 'Clothing',
      footwear: 'Footwear',
      accessory: 'Accessory',
      electronics: 'Electronics',
      ebook: 'eBook',
    };
    return labels[type] || type;
  };

  const getTypeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
    if (type === 'electronics') return 'default';
    if (type === 'ebook') return 'secondary';
    return 'outline';
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">No products found in this category.</p>
        <p className="text-sm text-muted-foreground mt-1">Click "Add Product" to create one.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-16">Image</TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded-md"
                />
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>
                <Badge variant={getTypeVariant(product.type)}>
                  {getTypeLabel(product.type)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground capitalize">
                {product.category.replace('-', ' ')}
              </TableCell>
              <TableCell className="text-right font-medium">
                ₹{product.price.toLocaleString()}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Active
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(product)}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(product.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductTable;
