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
        <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-10 relative overflow-hidden">
            <div className="blob-bg absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-secondary-container opacity-40 rounded-full"></div>
            <div className="blob-bg absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-primary-fixed opacity-30 rounded-full"></div>
            
            {/* Split Screen Card Container */}
            <div className="glass-card w-full max-w-5xl rounded-[40px] shadow-2xl border border-white/40 overflow-hidden flex flex-col md:flex-row z-10 min-h-[620px]">
                
                {/* Left Panel - Illustration and Testimonial (Hidden on mobile) */}
                <div className="hidden md:flex md:w-1/2 bg-primary/5 p-12 flex-col justify-between border-r border-outline-variant/20">
                    <div>
                        <h2 className="font-display-lg text-3xl font-bold text-primary mb-4 leading-tight">
                            Encuentra el cuidado perfecto para tus pequeños.
                        </h2>
                        <p className="text-on-surface-variant leading-relaxed text-sm font-medium">
                            Únete a nuestra comunidad de cuidadores verificados y padres dedicados a una infancia segura y feliz.
                        </p>
                    </div>
                    
                    <div className="flex justify-center my-6">
                        <img 
                            src="/family_vector.png" 
                            alt="Familia" 
                            className="max-h-[260px] w-auto object-contain hover:scale-105 transition-transform duration-500" 
                        />
                    </div>
                    
                    <div className="border-t border-outline-variant/30 pt-6">
                        <p className="text-xs text-on-surface-variant font-semibold italic leading-relaxed">
                            "Confiable y responsable. ¡Mis hijos adoran a su cuidadora!"
                        </p>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1">
                            — Sarah M.
                        </p>
                    </div>
                </div>
                
                {/* Right Panel - Form fields */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white/40 dark:bg-surface-container/40">
                    <div className="mb-6">
                        <h2 className="font-display-lg text-3xl font-bold text-primary mb-1">Crea tu Cuenta</h2>
                        <p className="text-on-surface-variant text-sm font-medium">Únete a nuestra comunidad de cuidadores verificados y padres.</p>
                    </div>

                    {error && <div className="bg-error-container text-on-error-container p-4 rounded-xl mb-6 text-sm font-bold border border-error/20 text-center">{error}</div>}
                    
                    {/* Role toggle */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Yo soy...</label>
                        <div className="flex bg-surface-container/60 p-1.5 rounded-2xl border border-outline-variant/20">
                            <button 
                                type="button"
                                onClick={() => setRole('parent')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${role === 'parent' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-white/50'}`}
                            >
                                Padre / Tutor
                            </button>
                            <button 
                                type="button"
                                onClick={() => setRole('sitter')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${role === 'sitter' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-white/50'}`}
                            >
                                Niñero/a
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Nombre Completo</label>
                            <input type="text" className="w-full p-4 rounded-2xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner text-sm" placeholder="Ej. María López" value={fullName} onChange={e => setFullName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                            <input type="email" className="w-full p-4 rounded-2xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner text-sm" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Contraseña</label>
                            <input type="password" className="w-full p-4 rounded-2xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner text-sm" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/>
                        </div>
                        
                        <div className="flex flex-col gap-3 mt-4">
                            <button type="submit" className="w-full bg-primary text-white py-4 rounded-full font-bold hover:bg-primary-container transition shadow-lg active:scale-[0.98]">
                                Crear Cuenta
                            </button>
                            <Link to="/login" className="w-full bg-secondary-fixed text-on-secondary-fixed text-center py-4 rounded-full font-bold hover:bg-secondary-fixed-dim transition shadow-md block">
                                Iniciar Sesión
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
