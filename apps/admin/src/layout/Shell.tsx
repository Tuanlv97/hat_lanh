import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { NAV } from './nav';

export function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="shell">
      <aside className="sidebar">
        <p className="brand">
          Hạt Lành <span>Quản trị</span>
        </p>
        <nav aria-label="Menu quản trị">
          <ul>
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="who">
          <p>{user?.name}</p>
          <button
            type="button"
            className="link"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
