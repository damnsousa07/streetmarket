import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import ForgotPassword from './pages/ForgotPassword';   // <-- NOVO
import ResetPassword from './pages/ResetPassword';     // <-- NOVO

import AdminSearchOrders from './pages/admin/AdminSearchOrders';
import AdminLogin from './pages/admin/AdminLogin';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminPanel from './pages/admin/AdminPanel';
import AdminCategories from './pages/admin/AdminCategories';
import AdminNotifications from './pages/admin/AdminNotifications';
import Search from './pages/Search';
import Checkout from './pages/Checkout';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            {/* User */}
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

            {/* Password recovery */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/search-orders" element={<AdminSearchOrders />} />
          </Routes>
        </main>
        <Footer />
        {/* Floats */}
        <FAQFloat />
        <SocialFloat />
      </div>
    </BrowserRouter>
  );
}