import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import SocialFloat from './components/SocialFloat';
import FAQFloat from './components/FAQFloat';

import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import Orders from './pages/Orders';
import Notifications from './pages/Notifications';
import Categories from './pages/Categories';
import CategoryProducts from './pages/CategoryProducts';
import PaypalReturn from './pages/PaypalReturn';
import FAQ from './pages/FAQ';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Search from './pages/Search';
import Checkout from './pages/Checkout';

// Admin
import AdminPanel from './pages/admin/AdminPanel';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCategories from './pages/admin/AdminCategories';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSearchOrders from './pages/admin/AdminSearchOrders';

// ============================================================
// COMPONENTE DE PROTEÇÃO DE ROTAS ADMIN
// ============================================================
function AdminRoute({ children }) {
  const adminKey = localStorage.getItem('admin_key');
  const userTipo = localStorage.getItem('user_tipo');

  // Verifica se tem a chave admin E se o utilizador é Administrador
  if (!adminKey || adminKey.trim().length === 0 || userTipo !== 'Administrador') {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ============================================================
// APP
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            {/* Utilizador */}
            <Route path="/" element={<Home />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:category_id" element={<CategoryProducts />} />
            <Route path="/search" element={<Search />} />
            <Route path="/checkout/:orderId" element={<Checkout />} />
            <Route path="/paypal-return" element={<PaypalReturn />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Admin – todas protegidas (redirecionam para / se não for admin) */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AdminOrders />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminRoute>
                  <AdminProducts />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <AdminRoute>
                  <AdminCategories />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <AdminRoute>
                  <AdminNotifications />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/search-orders"
              element={
                <AdminRoute>
                  <AdminSearchOrders />
                </AdminRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
        <FAQFloat />
        <SocialFloat />
      </div>
    </BrowserRouter>
  );
}