import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AdminProvider } from "@/context/AdminContext";
import { ProductProvider } from "@/context/ProductContext";
import NotFound from "./pages/NotFound";
import ShopLanding from "./pages/shop/ShopLanding";
import CategoryPage from "./pages/shop/CategoryPage";
import ProductDetail from "./pages/shop/ProductDetail";
import CartPage from "./pages/shop/CartPage";
import CheckoutPage from "./pages/shop/CheckoutPage";
import SuccessPage from "./pages/shop/SuccessPage";
import WishlistPage from "./pages/shop/WishlistPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ProductProvider>
      <CartProvider>
        <WishlistProvider>
          <AdminProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter basename="/store">
                <Routes>
                  <Route path="/" element={<ShopLanding />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/success" element={<SuccessPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminLogin />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AdminProvider>
        </WishlistProvider>
      </CartProvider>
    </ProductProvider>
  </QueryClientProvider>
);

export default App;
