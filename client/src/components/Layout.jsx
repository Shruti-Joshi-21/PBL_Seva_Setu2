import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  FileText,
  Bell,
  Clock,
  Flag,
  Calendar,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

function getPageTitle(pathname) {
  const p = pathname || '';
  if (p === '/teamlead' || p === '/teamlead/') return 'Overview';
  if (p.startsWith('/teamlead/tasks/create')) return 'Create task';
  if (p.startsWith('/teamlead/tasks')) return 'Tasks';
  if (p.startsWith('/teamlead/attendance')) return 'Attendance';
  if (p.startsWith('/teamlead/flags')) return 'Flagged records';
  if (p.startsWith('/teamlead/leave')) return 'Leave requests';
  if (p.startsWith('/teamlead/reports')) return 'Field reports';
  if (p === '/admin' || p === '/admin/') return 'Overview';
  if (p.startsWith('/admin/users')) return 'User management';
  if (p.startsWith('/admin/reports')) return 'System reports';
  if (p.startsWith('/worker/attendance')) return 'Attendance';
  if (p.startsWith('/worker/leave')) return 'Leave requests';
  if (p.startsWith('/worker')) return 'My tasks';
  return 'Overview';
}

function getUserInitials(user) {
  const name = user?.fullName || user?.name || '';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length) return parts[0].slice(0, 2).toUpperCase();
  return '—';
}

function getRoleLabel(role) {
  const map = { ADMIN: 'Admin', TEAM_LEAD: 'Team lead', FIELD_WORKER: 'Field worker' };
  return map[role] || role || '';
}

const SidebarLink = ({ to, icon: Icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors border-l-2 ${
      active
        ? 'text-white text-sm font-medium bg-white/15 border-[#C0B87A]'
        : 'text-white/70 text-sm font-normal border-transparent hover:bg-white/10 hover:text-white'
    }`}
  >
    <Icon className="w-4 h-4 shrink-0" />
    <span>{label}</span>
  </Link>
);

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/reports', icon: FileText, label: 'Analytics' },
  ];

  const teamLeadLinks = [
    { to: '/teamlead', icon: LayoutDashboard, label: 'Overview' },
    { to: '/teamlead/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/teamlead/attendance', icon: Clock, label: 'Attendance' },
    { to: '/teamlead/flags', icon: Flag, label: 'Flagged records' },
    { to: '/teamlead/leave', icon: Calendar, label: 'Leave requests' },
    { to: '/teamlead/reports', icon: FileText, label: 'Field reports' },
  ];

  const workerLinks = [
    { to: '/worker', icon: LayoutDashboard, label: 'My Tasks' },
    { to: '/worker/attendance', icon: CheckSquare, label: 'Attendance' },
    { to: '/worker/leave', icon: FileText, label: 'Leave Requests' },
  ];

  const getLinks = () => {
    switch (user?.role) {
      case 'ADMIN':
        return adminLinks;
      case 'TEAM_LEAD':
        return teamLeadLinks;
      case 'FIELD_WORKER':
        return workerLinks;
      default:
        return [];
    }
  };

  const pageTitle = getPageTitle(location.pathname);
  const initials = getUserInitials(user);
  const roleLabel = getRoleLabel(user?.role);

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex">
      <aside className="hidden md:flex flex-col w-64 bg-[#1a4a1a] p-4 fixed h-full z-20">
        <div className="px-4 mb-8">
          <h1 className="text-white text-xl font-medium">SevaSetu</h1>
          <p className="text-white/50 text-xs mt-0.5">Smart Field Workforce</p>
        </div>

        <nav className="flex-1 space-y-1">
          {getLinks().map((link) => (
            <SidebarLink
              key={link.to}
              {...link}
              active={location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)}
            />
          ))}
        </nav>

        <div className="border-t border-white/10 pt-3 mt-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#C0B87A] text-[#1a4a1a] text-xs font-medium flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.fullName || user?.name || 'User'}</p>
              <p className="text-white/50 text-[10px] truncate">{roleLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-white/50 text-xs hover:text-red-300 flex items-center gap-2 mt-2 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 relative min-h-screen flex flex-col">
        <header className="md:hidden bg-[#1a4a1a] p-4 flex items-center justify-between text-white sticky top-0 z-30">
          <h1 className="text-white text-xl font-medium">SevaSetu</h1>
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <header className="hidden md:flex bg-white h-14 border-b border-[#e8e0d0] items-center justify-between px-6 sticky top-0 z-10">
          <span className="text-base font-medium text-gray-800">{pageTitle}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 mr-3">Last updated just now</span>
            <div className="relative cursor-pointer">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#C0B87A] rounded-full" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1a4a1a] text-[#C0B87A] text-xs font-medium flex items-center justify-center cursor-pointer">
              {initials}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">{children}</div>
      </main>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div
            className="w-64 bg-[#1a4a1a] h-full p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="flex items-center justify-between mb-8 px-4">
              <div>
                <h1 className="text-white text-xl font-medium">SevaSetu</h1>
                <p className="text-white/50 text-xs mt-0.5">Smart Field Workforce</p>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {getLinks().map((link) => (
                <SidebarLink
                  key={link.to}
                  {...link}
                  active={location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </nav>
            <div className="border-t border-white/10 pt-3 mt-3 px-4">
              <button
                type="button"
                onClick={logout}
                className="text-white/50 text-xs hover:text-red-300 flex items-center gap-2 mt-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
