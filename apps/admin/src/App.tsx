import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { RequireAdmin } from './lib/auth';
import { ComingSoon } from './pages/ComingSoon';
import { Login } from './pages/Login';
import { Moderation } from './pages/Moderation';
import { PostForm } from './pages/PostForm';
import { Posts } from './pages/Posts';
import { Reports } from './pages/Reports';
import { Topics } from './pages/Topics';
import { Users } from './pages/Users';
import { Words } from './pages/Words';
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
        <Route path="blog" element={<Posts />} />
        <Route path="blog/chu-de" element={<Topics />} />
        <Route path="blog/:id" element={<PostForm />} />
        <Route path="binh-luan" element={<Moderation />} />
        <Route path="binh-luan/tu-khoa" element={<Words />} />
        <Route path="nguoi-dung" element={<Users />} />
        <Route path="bao-cao" element={<Reports />} />
        <Route path="*" element={<ComingSoon title="Không tìm thấy trang" />} />
      </Route>
    </Routes>
  );
}
