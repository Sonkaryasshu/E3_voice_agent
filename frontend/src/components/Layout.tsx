import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Settings, Activity } from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
    children: React.ReactNode;
}

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={clsx(
                "flex items-center space-x-2 px-4 py-2 rounded-md transition-colors",
                isActive
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100"
            )}
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
        </Link>
    );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 p-2 rounded-lg text-white">
                            <Activity size={24} />
                        </div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight">VoiceAgent<span className="text-blue-600">Admin</span></span>
                    </div>

                    <nav className="flex items-center space-x-1">
                        <NavItem to="/" icon={Phone} label="Dashboard" />
                        <NavItem to="/agents" icon={Settings} label="Agents" />
                    </nav>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
};
