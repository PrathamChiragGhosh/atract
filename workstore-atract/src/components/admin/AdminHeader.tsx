import { useAdmin } from '@/context/AdminContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User, Store } from 'lucide-react';
import atractLogo from '@/assets/atract-logo.png';

const AdminHeader = () => {
  const { adminUser, logout } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <img src={atractLogo} alt="Atract" className="h-8" />
        <div className="h-6 w-px bg-border" />
        <h1 className="text-lg font-semibold text-foreground">Shop Admin</h1>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground"
        >
          <Store className="h-4 w-4 mr-2" />
          View Shop
        </Button>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{adminUser}</span>
        </div>
        
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  );
};

export default AdminHeader;
