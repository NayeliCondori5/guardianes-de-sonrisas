import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import GlassCard from '../components/common/GlassCard';
import { useAuth } from '../context/AuthContext';
import { MapPin, Star, ShieldCheck, Heart, Car, Home, Cigarette, BookOpen } from 'lucide-react';
import CustomModal from '../components/common/CustomModal';

const SitterProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sitter, setSitter] = useState(null);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });

    useEffect(() => {
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const found = allUsers.find(s => s.id.toString() === id || s.id === id);
        // Default detailed data if missing
        if (found) {
            setSitter({
                ...found,
                name: found.full_name,
                avatar: found.avatar || '/child1.png',
                city: found.city || 'Ciudad no especificada',
                rate: found.rate || 15,
                age: found.age || 25,
                description: found.description || 'Cuidador apasionado y responsable.',
                superpowers: found.superpowers || ['Manualidades', 'Leer a niños', 'Música', 'Juegos creativos'],
                comfortableWith: found.comfortableWith || ['Mascotas', 'Ayuda con tarea', 'Cocinar'],
                education: found.education || 'Licenciatura en Educación Infantil',
                hasCar: found.hasCar !== undefined ? found.hasCar : true,
                driverLicense: found.driverLicense !== undefined ? found.driverLicense : true,
                smoker: found.smoker !== undefined ? found.smoker : false,
                preferredLocation: found.preferredLocation || 'En casa de la familia',
                lastActive: 'Hace 2 horas',
                experience: found.experience || 3,
                availability: found.availability || {
                    LUN: { manana: true, mediodia: false, tarde: true, noche: false },
                    MAR: { manana: true, mediodia: true, tarde: true, noche: false },
                    MIE: { manana: false, mediodia: false, tarde: true, noche: true },
                    JUE: { manana: true, mediodia: true, tarde: false, noche: false },
                    VIE: { manana: true, mediodia: true, tarde: true, noche: true },
                    SAB: { manana: false, mediodia: false, tarde: false, noche: true },
                    DOM: { manana: false, mediodia: false, tarde: false, noche: false },
                }
            });
        }
    }, [id]);

    const handleRequest = () => {
        if (!user) {
            setModal({
                isOpen: true,
                title: "Inicia Sesión",
                message: "Debes iniciar sesión como padre para solicitar a un cuidador.",
                type: 'info'
            });
            return;
        }
        if (user.role !== 'parent') {
            setModal({
                isOpen: true,
                title: "Acceso Restringido",
                message: "Solo los usuarios con rol de padre pueden realizar solicitudes.",
                type: 'error'
            });
            return;
        }

        const requests = JSON.parse(localStorage.getItem('booking_requests') || '[]');
        
        // Simple mock of time selection (normally would be a form)
        const selectedDate = new Date();
        selectedDate.setDate(selectedDate.getDate() + 2); // 2 days from now
        const hours = 4;
        
        const newRequest = {
            id: Date.now(),
            parentId: user.id?.toString() || 'parent1',
            parentName: user.full_name,
            sitterId: sitter.id,
            sitterName: sitter.name,
            status: 'PENDIENTE',
            date: selectedDate.toLocaleDateString(),
            hours: hours,
            total: sitter.rate * hours
        };
        requests.push(newRequest);
        localStorage.setItem('booking_requests', JSON.stringify(requests));
        
        setModal({
            isOpen: true,
            title: "¡Solicitud Enviada!",
            message: `Has solicitado a ${sitter.name}. El cuidador recibirá una notificación en su panel.`,
            type: 'success'
        });
    };

    if (!sitter) return <div>Cargando...</div>;

    const days = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
    const times = ['manana', 'mediodia', 'tarde', 'noche'];
    const timeLabels = { manana: 'Mañana', mediodia: 'Medio Día', tarde: 'Tarde', noche: 'Noche' };

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <Navbar />
            <div className="pt-28 pb-12 px-4 md:px-10 max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Basic Info & Actions */}
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="rounded-[32px] p-8 text-center relative">
                        {sitter.verified && (
                            <div className="absolute top-6 right-6 text-primary flex flex-col items-center">
                                <ShieldCheck size={32} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Verificada</span>
                            </div>
                        )}
                        <div className="w-40 h-40 mx-auto rounded-full overflow-hidden bg-surface-dim mb-6 border-4 border-white shadow-lg">
                            <img src={sitter.avatar} alt={sitter.name} className="w-full h-full object-cover" />
                        </div>
                        <h1 className="font-display-lg text-3xl font-bold text-dark">{sitter.name}</h1>
                        <p className="text-on-surface-variant flex items-center justify-center gap-1 mt-2 font-medium">
                            <MapPin size={18}/> {sitter.city}
                        </p>
                        <div className="flex justify-center items-center gap-4 mt-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">${sitter.rate}</p>
                                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Por hora</p>
                            </div>
                            <div className="w-px h-8 bg-outline-variant/30"></div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-dark">{sitter.age}</p>
                                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Años</p>
                            </div>
                        </div>

                        <button onClick={handleRequest} className="w-full mt-8 bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-container transition active:scale-95 text-lg">
                            SOLICITAR NIÑERA
                        </button>
                        <p className="text-xs text-on-surface-variant mt-4">Activa: {sitter.lastActive}</p>
                    </GlassCard>

                    <GlassCard className="rounded-[32px] p-6">
                        <h3 className="font-display-lg text-xl font-bold mb-4">Sobre Mí</h3>
                        <ul className="space-y-3 font-medium">
                            <li className="flex justify-between border-b border-outline-variant/20 pb-2"><span>Carnet de conducir:</span> <span className="font-bold">{sitter.driverLicense ? 'Sí' : 'No'}</span></li>
                            <li className="flex justify-between border-b border-outline-variant/20 pb-2"><span>Coche propio:</span> <span className="font-bold">{sitter.hasCar ? 'Sí' : 'No'}</span></li>
                            <li className="flex justify-between border-b border-outline-variant/20 pb-2"><span>Fumador:</span> <span className="font-bold">{sitter.smoker ? 'Sí' : 'No'}</span></li>
                            <li className="flex justify-between pt-1"><span>Lugar de trabajo:</span> <span className="font-bold">{sitter.preferredLocation}</span></li>
                        </ul>
                    </GlassCard>
                </div>

                {/* Right Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="rounded-[32px] p-8">
                        <h2 className="font-display-lg text-2xl font-bold text-primary mb-4">Descripción</h2>
                        <p className="text-on-surface-variant leading-relaxed text-lg">{sitter.description}</p>
                    </GlassCard>

                    <GlassCard className="rounded-[32px] p-8">
                        <h2 className="font-display-lg text-2xl font-bold text-primary mb-6">Disponibilidad</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-center border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-2 border-b-2 border-outline-variant/30"></th>
                                        {days.map(d => <th key={d} className="p-2 border-b-2 border-outline-variant/30 font-bold">{d}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {times.map(t => (
                                        <tr key={t}>
                                            <td className="p-3 border-b border-outline-variant/20 text-left font-bold text-sm text-on-surface-variant">{timeLabels[t]}</td>
                                            {days.map(d => (
                                                <td key={d} className="p-3 border-b border-outline-variant/20">
                                                    <div className={`w-6 h-6 mx-auto rounded-md ${sitter.availability[d][t] ? 'bg-secondary' : 'bg-surface-dim'}`}></div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <GlassCard className="rounded-[32px] p-6">
                            <h3 className="font-display-lg text-xl font-bold mb-4 flex items-center gap-2"><Star className="text-secondary"/> Mis Superpoderes</h3>
                            <div className="flex flex-wrap gap-2">
                                {sitter.superpowers.map(p => <span key={p} className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed rounded-full text-sm font-bold">{p}</span>)}
                            </div>
                        </GlassCard>

                        <GlassCard className="rounded-[32px] p-6">
                            <h3 className="font-display-lg text-xl font-bold mb-4 flex items-center gap-2"><Heart className="text-error"/> Cómoda con</h3>
                            <div className="flex flex-wrap gap-2">
                                {sitter.comfortableWith.map(c => <span key={c} className="px-3 py-1 bg-error-container text-on-error-container rounded-full text-sm font-bold">{c}</span>)}
                            </div>
                        </GlassCard>
                        
                        <GlassCard className="rounded-[32px] p-6 md:col-span-2">
                            <h3 className="font-display-lg text-xl font-bold mb-4 flex items-center gap-2"><BookOpen className="text-primary"/> Educación y Certificaciones</h3>
                            <p className="text-on-surface-variant font-medium">{sitter.education}</p>
                            <p className="text-sm text-outline mt-2">Certificado de primeros auxilios pediátricos vigente.</p>
                        </GlassCard>
                    </div>

                    <GlassCard className="rounded-[32px] p-6">
                        <h3 className="font-display-lg text-xl font-bold mb-4">Ubicación</h3>
                        <div className="w-full h-64 bg-surface-dim rounded-2xl flex items-center justify-center border border-outline-variant/30">
                            <p className="text-on-surface-variant font-bold flex items-center gap-2"><MapPin/> Mapa de Google simulado para {sitter.city}</p>
                        </div>
                    </GlassCard>
                </div>
            </div>
            
            <CustomModal 
                isOpen={modal.isOpen}
                onClose={() => {
                    setModal({ ...modal, isOpen: false });
                    if (modal.title === "¡Solicitud Enviada!") navigate('/dashboard/parent');
                    if (modal.title === "Inicia Sesión") navigate('/login');
                }}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
        </div>
    );
};

export default SitterProfile;
