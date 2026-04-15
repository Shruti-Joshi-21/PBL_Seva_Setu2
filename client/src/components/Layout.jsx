import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    MapPin,
    CheckSquare,
    Clock,
    Flag,
    Calendar,
    Users,
    FileText,
    Bell,
    LogOut,
    Menu,
    X,
    User,
    ClipboardList,
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, label, active, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active
                ? 'bg-[#005F02] text-white shadow-md'
                : 'text-[#427A43] hover:bg-[#F2E3BB]'
            }`}
    >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
    </Link>
);

function isWorkerNavActive(pathname, to) {
    const p = pathname.replace(/\/$/, '') || '/';
    if (to === '/worker') return p === '/worker';
    if (to === '/worker/attendance') return p.startsWith('/worker/attendance');
    return p === to || p.startsWith(`${to}/`);
}

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
        { to: '/teamlead/tasks/create', icon: CheckSquare, label: 'Create Task' },
        { to: '/teamlead/attendance', icon: Clock, label: 'Attendance' },
        { to: '/teamlead/flags', icon: Flag, label: 'Flagged records' },
        { to: '/teamlead/leave', icon: Calendar, label: 'Leave requests' },
        { to: '/teamlead/reports', icon: FileText, label: 'Field reports' },
      ];

    const workerLinks = [
        { to: '/worker', icon: LayoutDashboard, label: 'Home' },
        { to: '/worker/tasks', icon: ClipboardList, label: 'My Tasks' },
        { to: '/worker/attendance', icon: CheckSquare, label: 'Attendance' },
        { to: '/worker/leave', icon: FileText, label: 'Leave Requests' },
    ];

    const getLinks = () => {
        switch (user?.role) {
            case 'ADMIN': return adminLinks;
            case 'TEAM_LEAD': return teamLeadLinks;
            case 'FIELD_WORKER': return workerLinks;
            default: return [];
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 p-4 fixed h-full z-20">
                <div className="px-4 mb-8">
                    <h1 className="text-2xl font-bold text-[#005F02]">SevaSetu</h1>
                </div>

                <nav className="flex-1 space-y-1">
                    {getLinks().map(link => (
                        <SidebarLink
                            key={link.to}
                            {...link}
                            active={
                                user?.role === 'FIELD_WORKER'
                                    ? isWorkerNavActive(location.pathname, link.to)
                                    : location.pathname === link.to
                            }
                        />
                    ))}
                </nav>

                <div className="pt-4 mt-4 border-t border-gray-100">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 relative min-h-screen flex flex-col">
                {/* Header Mobile */}
                <header className="md:hidden bg-[#005F02] p-4 flex items-center justify-between text-white sticky top-0 z-30">
                    <h1 className="text-xl font-bold">SevaSetu</h1>
                    <button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
                </header>

                {/* Header Desktop */}
                <header className="hidden md:flex bg-white h-16 border-b border-gray-200 items-center justify-between px-8 sticky top-0 z-10">
                    <div className="text-gray-500 font-medium">
                        Welcome back, <span className="text-[#005F02]">{user?.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-gray-400 hover:text-[#005F02] transition-colors"><Bell className="w-5 h-5" /></button>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                            <User className="w-4 h-4 text-[#427A43]" />
                            <span className="text-sm font-semibold text-gray-700">{user?.role}</span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 md:p-8 flex-1">
                    {children}
                </div>
            </main>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
                    <div className="w-64 bg-white h-full p-4 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-8 px-4">
                            <h1 className="text-xl font-bold text-[#005F02]">SevaSetu</h1>
                            <button onClick={() => setSidebarOpen(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <nav className="flex-1 space-y-1">
                            {getLinks().map(link => (
                                <SidebarLink
                                    key={link.to}
                                    {...link}
                                    active={
                                        user?.role === 'FIELD_WORKER'
                                            ? isWorkerNavActive(location.pathname, link.to)
                                            : location.pathname === link.to
                                    }
                                    onClick={() => setSidebarOpen(false)}
                                />
                            ))}
                        </nav>
                        <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-red-600 font-medium mt-auto"><LogOut className="w-5 h-5" /> Logout</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
