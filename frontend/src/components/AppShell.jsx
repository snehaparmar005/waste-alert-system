import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { apiRequest, clearSession } from '../api/client';
export default function AppShell({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const role = user?.role;
  const handleLogout = async () => {
    try { await apiRequest('/api/logout', { method: 'POST' }); } catch {}
    clearSession();
    onLogout();
    navigate('/login');
  };
  const navItemsByRole = {
    citizen: [
      { to: '/report', label: 'Report Waste' },
      { to: '/my-reports', label: 'My Reports' },
      { to: '/profile', label: 'Settings & Profile' },
    ],
    gov: [
      { to: '/gov/dashboard', label: 'Dashboard' },
      { to: '/gov/reports', label: 'Manage Complaints' },
    ],
    worker: [
      { to: '/worker/dashboard', label: 'Assigned Tasks' },
    ],
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard' },
      { to: '/admin/reports', label: 'Manage Complaints' },
      { to: '/admin/users', label: 'Staff Management' },
      { to: '/admin/authorities', label: 'Wards & Map' },
      { to: '/admin/alerts', label: 'Notifications' },
    ],
  };
  if (!role) {
    return (
      <div className='min-h-screen flex flex-col bg-[#F4F7F6] text-[#172B27]'>
        <header className='bg-[#0B4650] text-white px-6 py-3.5 shadow-sm flex items-center justify-between'>
          <Link to='/' className='flex items-center gap-3'>
            <span className='h-9 w-9 rounded-xl bg-[#159B43] text-white font-extrabold flex items-center justify-center text-sm'>C2C</span>
            <div>
              <span className='text-xl font-extrabold block leading-none'>Click-<span className='text-[#F8C31C]'>2</span>-Clean</span>
              <span className='text-[11px] uppercase tracking-widest text-emerald-200'>Snap. Sort. Alert.</span>
            </div>
          </Link>
          <div className='flex items-center gap-4 text-sm font-medium'>
            <Link to='/' className='hover:text-[#F8C31C]'>Home</Link>
            <Link to='/login' className='hover:text-[#F8C31C]'>Login</Link>
            <Link to='/register' className='bg-[#159B43] hover:bg-[#118037] text-white px-4 py-2 rounded-lg font-semibold'>Register</Link>
          </div>
        </header>
        <main className='flex-grow'>{children}</main>
      </div>
    );
  }
  const links = navItemsByRole[role] || [];
  return (
    <div className='min-h-screen flex bg-[#F4F7F6] text-[#172B27]'>
      <aside className={\ixed inset-y-0 left-0 z-40 w-64 bg-[#0B4650] text-white flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 \}>
        <div>
          <div className='p-5 flex items-center gap-3 border-b border-white/10'>
            <span className='h-10 w-10 rounded-xl bg-[#159B43] text-white font-extrabold flex items-center justify-center text-sm'>C2C</span>
            <div>
              <span className='text-lg font-extrabold tracking-tight block leading-tight'>Click-<span className='text-[#F8C31C]'>2</span>-Clean</span>
              <span className='text-[11px] text-emerald-200 tracking-wide'>Snap. Sort. Alert.</span>
            </div>
          </div>
          <nav className='p-4 space-y-1.5 text-sm font-medium'>
            {links.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => \lex items-center gap-3 px-4 py-3 rounded-xl transition \}>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className='p-4 border-t border-white/10 space-y-3'>
          <button onClick={handleLogout} className='w-full bg-red-500/90 hover:bg-red-600 text-white py-2.5 rounded-xl text-xs font-semibold transition'>Logout ({user.name})</button>
        </div>
      </aside>
      <div className='flex-1 flex flex-col min-w-0'>
        <header className='bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30'>
          <button type='button' onClick={() => setSidebarOpen(!sidebarOpen)} className='lg:hidden px-3 py-1.5 rounded-lg border text-xs font-bold text-gray-600'>Menu</button>
          <div className='ml-auto flex items-center gap-3'>
            <div className='h-9 w-9 rounded-full bg-[#0B4650] text-white font-bold text-sm flex items-center justify-center uppercase'>{(user.name || 'U').charAt(0)}</div>
            <div className='leading-tight'>
              <p className='text-sm font-bold text-gray-800'>{user.name}</p>
              <p className='text-[11px] text-gray-500 capitalize'>{role === 'gov' ? 'Nagar Nigam' : role}</p>
            </div>
          </div>
        </header>
        <main className='flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto'>{children}</main>
      </div>
    </div>
  );
}
