import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [role, setRole] = useState('parent');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [city, setCity] = useState('');
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (email.includes('@admin.com')) {
            setError('No puedes registrarte con este correo de administrador');
            return;
        }
        try {
            const user = await register({ email, password, role, full_name: fullName, city });
            if (user.role === 'parent') navigate('/dashboard/parent');
            else navigate('/dashboard/sitter');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrarse');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pt-24 pb-12 relative overflow-hidden">
            <div className="blob-bg absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-secondary-container opacity-40 rounded-full"></div>
            <div className="blob-bg absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-primary-fixed opacity-30 rounded-full"></div>
            
            <div className="glass-card w-full max-w-lg rounded-[32px] p-8 md:p-10 z-10 shadow-xl border border-white/40">
                <div className="text-center mb-8">
                    <h2 className="font-display-lg text-3xl font-bold text-primary mb-2">Crear Cuenta</h2>
                    <p className="text-on-surface-variant">Únete a la familia de Guardianes de Sonrisas</p>
                </div>

                {error && <div className="bg-error-container text-on-error-container p-4 rounded-xl mb-6 text-sm font-bold border border-error/20">{error}</div>}
                
                <div className="flex gap-4 mb-8 bg-surface-container p-2 rounded-2xl">
                    <button 
                        type="button"
                        onClick={() => setRole('parent')}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 ${role === 'parent' ? 'bg-primary text-white shadow-md' : 'text-on-surface hover:bg-white/50'}`}
                    >
                        Soy Padre
                    </button>
                    <button 
                        type="button"
                        onClick={() => setRole('sitter')}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 ${role === 'sitter' ? 'bg-primary text-white shadow-md' : 'text-on-surface hover:bg-white/50'}`}
                    >
                        Soy Cuidador
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div>
                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Nombre Completo</label>
                        <input type="text" className="w-full p-4 rounded-xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner" placeholder="Ej. María López" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Correo Electrónico</label>
                        <input type="email" className="w-full p-4 rounded-xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Contraseña</label>
                        <input type="password" className="w-full p-4 rounded-xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/>
                    </div>
                    <button type="submit" className="w-full bg-primary text-white py-4 mt-4 rounded-full font-bold hover:bg-primary/90 transition shadow-lg active:scale-[0.98]">
                        Registrarse
                    </button>
                </form>

                <p className="text-center mt-6 text-on-surface-variant font-medium">
                    ¿Ya tienes una cuenta? <Link to="/login" className="text-primary font-bold hover:underline">Inicia Sesión</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
