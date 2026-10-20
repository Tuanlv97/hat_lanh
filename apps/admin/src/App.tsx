import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { NAV } from './layout/nav';
import { RequireAdmin } from './lib/auth';
import { ComingSoon } from './pages/ComingSoon';
import { Login } from './pages/Login';
import { OrderDetail } from './pages/OrderDetail';
import { Orders } from './pages/Orders';
import { ProductForm } from './pages/ProductForm';
import { Products } from './pages/Products';
import { ReturnForm } from './pages/ReturnForm';
import { Returns } from './pages/Returns';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAdmin>
            <Shell />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="/san-pham" replace />} />
        <Route path="san-pham" element={<Products />} />
        <Route path="san-pham/:id" element={<ProductForm />} />
        <Route path="don-hang" element={<Orders />} />
        <Route path="don-hang/:id" element={<OrderDetail />} />
        <Route path="hoan-tra" element={<Returns />} />
        <Route path="hoan-tra/tao" element={<ReturnForm />} />
        {NAV.filter((n) => !['/san-pham', '/don-hang', '/hoan-tra'].includes(n.to)).map((n) => (
          <Route key={n.to} path={`${n.to}/*`} element={<ComingSoon title={n.label} />} />
        ))}
        <Route path="*" element={<ComingSoon title="Không tìm thấy trang" />} />
      </Route>
    </Routes>
  );
}
