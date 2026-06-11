import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [show2FAChallenge, setShow2FAChallenge] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [tempUserId, setTempUserId] = useState('');
    const { login, verify2FA } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await login(email, password);
            if (res && res.requires2FA) {
                setTempUserId(res.userId);
                setShow2FAChallenge(true);
            } else if (res) {
                if (res.role === 'admin') navigate('/dashboard/admin');
                else if (res.role === 'parent') navigate('/dashboard/parent');
                else navigate('/dashboard/sitter');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al iniciar sesión');
        }
    };

    const handle2FAVerify = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const user = await verify2FA(tempUserId, otpCode);
            if (user) {
                if (user.role === 'admin') navigate('/dashboard/admin');
                else if (user.role === 'parent') navigate('/dashboard/parent');
                else navigate('/dashboard/sitter');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Código de seguridad incorrecto');
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-10 relative overflow-hidden">
            <div className="blob-bg absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-primary-fixed opacity-40 rounded-full"></div>
            <div className="blob-bg absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-secondary-container opacity-30 rounded-full"></div>
            
            {/* Split Screen Card Container */}
            <div className="glass-card w-full max-w-5xl rounded-[40px] shadow-2xl border border-white/40 overflow-hidden flex flex-col md:flex-row z-10 min-h-[600px]">
                
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
                            "La mejor plataforma para encontrar cuidadores. Es rápida, segura y sumamente confiable."
                        </p>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1">
                            — Carlos D.
                        </p>
                    </div>
                </div>
                
                {/* Right Panel - Form fields */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white/40 dark:bg-surface-container/40">
                    <div className="mb-8">
                        <h2 className="font-display-lg text-3xl font-bold text-primary mb-1">Bienvenido de nuevo</h2>
                        <p className="text-on-surface-variant text-sm font-medium">Ingresa a tu cuenta de Guardianes de Sonrisas</p>
                    </div>

                    {error && <div className="bg-error-container text-on-error-container p-4 rounded-xl mb-6 text-sm font-bold border border-error/20 text-center">{error}</div>}
                    
                    {show2FAChallenge ? (
                        <form onSubmit={handle2FAVerify} className="flex flex-col gap-5">
                            <div>
                                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Código de Seguridad (2FA)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-4 rounded-2xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner text-sm font-bold text-center tracking-widest" 
                                    placeholder="123456" 
                                    value={otpCode} 
                                    onChange={e => setOtpCode(e.target.value)} 
                                    required 
                                    maxLength="6"
                                    autoFocus
                                />
                                <p className="text-xs text-on-surface-variant mt-2 text-center">
                                    Introduce el código de 6 dígitos de tu aplicación de autenticación para continuar.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 mt-4">
                                <button type="submit" className="w-full bg-primary text-white py-4 rounded-full font-bold hover:bg-primary-container transition shadow-lg active:scale-[0.98]">
                                    Verificar y Entrar
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShow2FAChallenge(false);
                                        setOtpCode('');
                                        setError('');
                                    }} 
                                    className="w-full bg-surface-container text-on-surface-variant py-4 rounded-full font-bold hover:bg-surface-container-highest transition block text-center"
                                >
                                    Volver
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div>
                                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Correo Electrónico</label>
                                <input type="email" className="w-full p-4 rounded-2xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner text-sm" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Contraseña</label>
                                <input type="password" className="w-full p-4 rounded-2xl border-none bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner text-sm" placeholder="Tu contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                            
                            <div className="flex flex-col gap-3 mt-4">
                                <button type="submit" className="w-full bg-primary text-white py-4 rounded-full font-bold hover:bg-primary-container transition shadow-lg active:scale-[0.98]">
                                    Iniciar Sesión
                                </button>
                                <Link to="/register" className="w-full bg-secondary-fixed text-on-secondary-fixed text-center py-4 rounded-full font-bold hover:bg-secondary-fixed-dim transition shadow-md block">
                                    Registrarse
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
