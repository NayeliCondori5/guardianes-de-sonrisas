import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, Menu, X } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const checkNotifications = () => {
            if (user?.role === 'sitter') {
                const reqs = JSON.parse(localStorage.getItem('booking_requests') || '[]');
                const pending = reqs.filter(r => r.sitterId === user.id && r.status === 'PENDIENTE').length;
                setPendingCount(pending);
            }
        };
        checkNotifications();
        window.addEventListener('storage', checkNotifications);
        return () => window.removeEventListener('storage', checkNotifications);
    }, [user]);

    const handleLinkClick = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="fixed top-0 left-0 w-full z-50 bg-white/60 dark:bg-surface-container/60 backdrop-blur-[20px] border-b border-white/20 shadow-[0_30px_30px_rgba(13,28,46,0.08)]">
            <div className="flex justify-between items-center px-4 md:px-10 h-[80px]">
                <div className="flex items-center gap-4">
                    <Link to="/" className="font-display-lg text-2xl font-bold text-primary dark:text-primary-fixed-dim">Guardianes de Sonrisas</Link>
                </div>
                
                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link to="/" className="text-on-surface-variant dark:text-outline-variant font-medium hover:bg-primary/5 transition-all duration-300 font-body-md px-2 py-1 rounded-lg">Inicio</Link>
                    <Link to="/services" className="text-on-surface-variant dark:text-outline-variant font-medium hover:bg-primary/5 transition-all duration-300 font-body-md px-2 py-1 rounded-lg">Servicios</Link>
                    <Link to="/how-it-works" className="text-on-surface-variant dark:text-outline-variant font-medium hover:bg-primary/5 transition-all duration-300 font-body-md px-2 py-1 rounded-lg">Cómo Funciona</Link>
                    <Link to="/search" className="text-primary dark:text-primary-fixed-dim border-b-2 border-primary font-bold pb-1 font-body-md">Cuidadores</Link>
                </nav>
                
                <div className="flex items-center gap-4">
                    {/* User Profile / Login Options (Desktop) */}
                    <div className="hidden md:flex items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-on-surface-variant">Hola, {user.full_name}</span>
                                {user.role === 'sitter' && pendingCount > 0 && (
                                    <div className="relative cursor-pointer" onClick={() => navigate('/dashboard/sitter')}>
                                        <Bell size={24} className="text-primary" />
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white">
                                            {pendingCount}
                                        </span>
                                    </div>
                                )}
                                <Link to={`/dashboard/${user.role}`} className="text-primary font-bold font-body-md transition-transform hover:scale-105">Panel</Link>
                                <button onClick={logout} className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold font-body-md transition-transform hover:scale-105 active:scale-95 shadow-lg text-sm">Salir</button>
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="text-primary font-bold font-body-md transition-transform active:opacity-80">Iniciar Sesión</Link>
                                <Link to="/register" className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold font-body-md transition-transform hover:scale-105 active:scale-95 shadow-lg">Registrarse</Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Toggle Button */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2.5 rounded-xl bg-surface-container/50 text-on-surface hover:bg-surface-container-highest transition-all duration-300 border border-outline-variant/10 shadow-sm"
                        aria-label="Toggle Menu"
                    >
                        {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden px-6 pb-6 pt-2 bg-white/95 dark:bg-surface-container/95 backdrop-blur-[20px] border-t border-outline-variant/20 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
                    <nav className="flex flex-col gap-3">
                        <Link to="/" onClick={handleLinkClick} className="text-on-surface-variant font-semibold p-2 hover:bg-primary/5 rounded-xl transition">Inicio</Link>
                        <Link to="/services" onClick={handleLinkClick} className="text-on-surface-variant font-semibold p-2 hover:bg-primary/5 rounded-xl transition">Servicios</Link>
                        <Link to="/how-it-works" onClick={handleLinkClick} className="text-on-surface-variant font-semibold p-2 hover:bg-primary/5 rounded-xl transition">Cómo Funciona</Link>
                        <Link to="/search" onClick={handleLinkClick} className="text-primary font-bold p-2 hover:bg-primary/5 rounded-xl transition">Cuidadores</Link>
                    </nav>

                    <div className="h-px bg-outline-variant/30 my-1"></div>

                    <div className="flex flex-col gap-3">
                        {user ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-sm font-semibold text-on-surface-variant">Hola, {user.full_name}</span>
                                    {user.role === 'sitter' && pendingCount > 0 && (
                                        <div className="relative cursor-pointer" onClick={() => { handleLinkClick(); navigate('/dashboard/sitter'); }}>
                                            <Bell size={20} className="text-primary" />
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                                {pendingCount}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <Link to={`/dashboard/${user.role}`} onClick={handleLinkClick} className="text-center bg-primary/10 text-primary py-2.5 rounded-xl font-bold shadow-sm">Panel</Link>
                                <button onClick={() => { handleLinkClick(); logout(); }} className="bg-primary text-on-primary py-2.5 rounded-xl font-bold shadow-md">Salir</button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <Link to="/login" onClick={handleLinkClick} className="text-center text-primary font-bold py-2.5 rounded-xl border border-primary">Iniciar Sesión</Link>
                                <Link to="/register" onClick={handleLinkClick} className="text-center bg-primary text-on-primary py-2.5 rounded-xl font-bold shadow-md">Registrarse</Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;
