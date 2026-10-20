import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { NAV } from './layout/nav';
import { RequireAdmin } from './lib/auth';
import { ComingSoon } from './pages/ComingSoon';
import { Login } from './pages/Login';

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
        {NAV.map((n) => (
          <Route key={n.to} path={`${n.to}/*`} element={<ComingSoon title={n.label} />} />
        ))}
        <Route path="*" element={<ComingSoon title="Không tìm thấy trang" />} />
      </Route>
    </Routes>
  );
}
