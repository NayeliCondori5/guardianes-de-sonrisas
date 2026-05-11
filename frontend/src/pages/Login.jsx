import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const user = await login(email, password);
            if (user.role === 'admin') navigate('/dashboard/admin');
            else if (user.role === 'parent') navigate('/dashboard/parent');
            else navigate('/dashboard/sitter');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al iniciar sesión');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pt-24 pb-12 relative overflow-hidden">
            <div className="blob-bg absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-primary-fixed opacity-40 rounded-full"></div>
            <div className="blob-bg absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-secondary-container opacity-30 rounded-full"></div>
            
            <div className="glass-card w-full max-w-md rounded-[32px] p-8 md:p-10 z-10 shadow-xl border border-white/40">
                <div className="text-center mb-10">
                    <h2 className="font-display-lg text-3xl font-bold text-primary mb-2">Bienvenido de nuevo</h2>
                    <p className="text-on-surface-variant">Ingresa a tu cuenta de Guardianes</p>
                </div>

                {error && <div className="bg-error-container text-on-error-container p-4 rounded-xl mb-6 text-sm font-bold border border-error/20 text-center">{error}</div>}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Correo Electrónico</label>
                        <input type="email" className="w-full p-4 rounded-xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Contraseña</label>
                        <input type="password" className="w-full p-4 rounded-xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner" placeholder="Tu contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full bg-primary text-white py-4 mt-2 rounded-full font-bold hover:bg-primary/90 transition shadow-lg active:scale-[0.98]">
                        Iniciar Sesión
                    </button>
                </form>
                
                <p className="text-center mt-8 text-on-surface-variant font-medium">
                    ¿No tienes una cuenta? <Link to="/register" className="text-primary font-bold hover:underline">Regístrate</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
