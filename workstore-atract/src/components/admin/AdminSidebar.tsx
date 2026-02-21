import { cn } from '@/lib/utils';
import { Laptop, User, Users, BookOpen, LayoutDashboard } from 'lucide-react';

interface AdminSidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { id: 'all', name: 'All Products', icon: LayoutDashboard },
  { id: 'electronics', name: 'Electronics', icon: Laptop },
  { id: 'fashion-men', name: 'Fashion – Men', icon: User },
  { id: 'fashion-women', name: 'Fashion – Women', icon: Users },
  { id: 'ebooks', name: 'eBooks', icon: BookOpen },
];

const AdminSidebar = ({ selectedCategory, onCategoryChange }: AdminSidebarProps) => {
  return (
    <aside className="w-64 border-r bg-muted/30 min-h-[calc(100vh-4rem)]">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Categories
        </h2>
        <nav className="space-y-1">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default AdminSidebar;
