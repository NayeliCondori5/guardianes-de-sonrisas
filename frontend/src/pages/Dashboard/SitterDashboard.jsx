import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import GlassCard from '../../components/common/GlassCard';
import { Calendar, Clock, DollarSign, Star, Camera, Check, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomModal from '../../components/common/CustomModal';

const SitterDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('requests');
    const [requests, setRequests] = useState([]);
    const [earnings, setEarnings] = useState(0);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });
    
    // Availability state
    const days = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
    const times = ['manana', 'mediodia', 'tarde', 'noche'];
    const timeLabels = { manana: 'Mañana', mediodia: 'Medio Día', tarde: 'Tarde', noche: 'Noche' };
    
    const [availability, setAvailability] = useState(user?.availability || {
        LUN: { manana: false, mediodia: false, tarde: false, noche: false },
        MAR: { manana: false, mediodia: false, tarde: false, noche: false },
        MIE: { manana: false, mediodia: false, tarde: false, noche: false },
        JUE: { manana: false, mediodia: false, tarde: false, noche: false },
        VIE: { manana: false, mediodia: false, tarde: false, noche: false },
        SAB: { manana: false, mediodia: false, tarde: false, noche: false },
        DOM: { manana: false, mediodia: false, tarde: false, noche: false },
    });

    const [selectedSuperpowers, setSelectedSuperpowers] = useState(user?.superpowers || []);
    const [selectedComfortable, setSelectedComfortable] = useState(user?.comfortableWith || []);
    
    const superpowerOptions = ['Manualidades', 'Dibujar', 'Leer cuentos', 'Música', 'Juegos creativos', 'Cocina básica', 'Idiomas', 'Primeros Auxilios'];
    const comfortableOptions = ['Mascotas', 'Ayuda con tareas', 'Cocinar', 'Bebés', 'Niños con necesidades especiales', 'Tareas del hogar'];
    const educationOptions = ['Estudiante Universitario', 'Licenciado en Pedagogía', 'Auxiliar de Enfermería', 'Técnico en Educación Infantil', 'Otros'];

    const [profileImage, setProfileImage] = useState(user?.avatar || null);
    
    const [profileForm, setProfileForm] = useState({
        full_name: '',
        age: '',
        rate: '',
        experience: '',
        description: '',
        education: 'Estudiante Universitario',
        driverLicense: 'No',
        hasCar: 'No',
        smoker: 'No',
        preferredLocation: 'En casa de la familia'
    });

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({ ...prev, [name]: value }));
    };
    const refreshData = () => {
        const reqs = JSON.parse(localStorage.getItem('booking_requests') || '[]');
        const myReqs = reqs.filter(r => r.sitterId === (user?.id || 1));
        setRequests(myReqs);
        
        const completed = myReqs.filter(r => r.status === 'COMPLETADO');
        const total = completed.reduce((acc, r) => acc + (r.total * 0.9), 0);
        setEarnings(total);
    };

    useEffect(() => {
        if (user) {
            refreshData();
            // Sync states when user data arrives
            if (user.availability) setAvailability(user.availability);
            if (user.superpowers) setSelectedSuperpowers(user.superpowers);
            if (user.comfortableWith) setSelectedComfortable(user.comfortableWith);
            if (user.avatar) setProfileImage(user.avatar);
            
            // Sync form fields
            setProfileForm({
                full_name: user.full_name || '',
                age: user.age || '',
                rate: user.rate || '',
                experience: user.experience || '',
                description: user.description || '',
                education: user.education || 'Estudiante Universitario',
                driverLicense: user.driverLicense ? 'Sí' : 'No',
                hasCar: user.hasCar ? 'Sí' : 'No',
                smoker: user.smoker ? 'Sí' : 'No',
                preferredLocation: user.preferredLocation || 'En casa de la familia'
            });
        }
        window.addEventListener('storage', refreshData);
        return () => window.removeEventListener('storage', refreshData);
    }, [user]);

    const handleAction = (id, newStatus) => {
        const reqs = JSON.parse(localStorage.getItem('booking_requests') || '[]');
        const updated = reqs.map(r => r.id === id ? { ...r, status: newStatus } : r);
        localStorage.setItem('booking_requests', JSON.stringify(updated));
        refreshData();
        window.dispatchEvent(new Event('storage'));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result;
                setProfileImage(base64);
                
                const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
                const updatedUsers = allUsers.map(u => u.id === user.id ? { ...u, avatar: base64 } : u);
                localStorage.setItem('users', JSON.stringify(updatedUsers));
                
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...currentUser, avatar: base64 }));
                
                setModal({
                    isOpen: true,
                    title: "Foto Actualizada",
                    message: "Tu nueva foto de perfil se ha guardado correctamente.",
                    type: 'success'
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleOption = (list, setList, option) => {
        if (list.includes(option)) {
            setList(list.filter(item => item !== option));
        } else {
            setList([...list, option]);
        }
    };

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <Navbar />
            <div className="container mx-auto px-4 pt-28 pb-12 flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-64 flex-shrink-0">
                    <GlassCard className="rounded-[32px] p-6 shadow-xl sticky top-28">
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary text-3xl font-bold mb-4 overflow-hidden border-2 border-secondary">
                                    {profileImage ? (
                                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.full_name?.charAt(0) || 'C'
                                    )}
                                </div>
                                <label className="absolute bottom-4 right-0 bg-primary text-white p-1.5 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                                    <Camera size={16} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </div>
                            <h2 className="font-display-lg text-xl font-bold text-center">{user?.full_name}</h2>
                            <p className="text-on-surface-variant text-sm text-center">Cuidador Profesional</p>
                        </div>
                        <nav className="flex flex-col gap-2">
                            <button onClick={() => setActiveTab('requests')} className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${activeTab === 'requests' ? 'bg-primary text-white shadow-md' : 'hover:bg-surface-container'}`}><Calendar size={20} /> Solicitudes</button>
                            <button onClick={() => setActiveTab('earnings')} className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${activeTab === 'earnings' ? 'bg-primary text-white shadow-md' : 'hover:bg-surface-container'}`}><DollarSign size={20} /> Ganancias</button>
                            <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'hover:bg-surface-container'}`}><Star size={20} /> Editar Perfil</button>
                        </nav>
                    </GlassCard>
                </aside>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    {!user ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'requests' && (
                        <div>
                            <h2 className="font-display-lg text-3xl font-bold text-primary mb-6">Solicitudes de Cuidado</h2>
                            <div className="space-y-4">
                                {requests.length > 0 ? requests.map(req => (
                                    <GlassCard key={req.id} className="rounded-[24px] p-6 shadow-md hover:shadow-lg transition-shadow">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <h3 className="font-display-lg text-xl font-bold mb-2 flex items-center gap-2">
                                                    {req.parentName}
                                                    <Link to={`/parent/${req.parentId}`} className="text-primary hover:text-primary-container transition p-1" title="Ver Perfil del Padre">
                                                        <Eye size={18} />
                                                    </Link>
                                                </h3>
                                                <div className="flex gap-4 text-sm text-on-surface-variant"><span className="flex items-center gap-1 font-bold"><Calendar size={16} className="text-primary"/> {req.date}</span></div>
                                            </div>
                                            <div className="font-bold text-xl text-primary">${req.total}</div>
                                            <div className="flex gap-2 w-full md:w-auto">
                                                {req.status === 'PENDIENTE' && (
                                                    <><button onClick={() => handleAction(req.id, 'ACEPTADA')} className="flex-1 md:flex-none bg-primary text-white px-6 py-2 rounded-full font-bold hover:bg-primary-container transition">Aceptar</button><button onClick={() => handleAction(req.id, 'RECHAZADA')} className="flex-1 md:flex-none bg-error-container text-on-error-container px-6 py-2 rounded-full font-bold transition hover:bg-error hover:text-white">Rechazar</button></>
                                                )}
                                                {req.status === 'PAGADO' && <button onClick={() => handleAction(req.id, 'CONFIRMADO')} className="flex-1 md:flex-none bg-secondary text-white px-6 py-2 rounded-full font-bold hover:bg-secondary-container transition">Confirmar Pago</button>}
                                                {req.status !== 'PENDIENTE' && req.status !== 'PAGADO' && <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${req.status === 'CONFIRMADO' ? 'bg-green-100 text-green-700' : 'bg-surface-container text-on-surface-variant'}`}>{req.status}</span>}
                                            </div>
                                        </div>
                                    </GlassCard>
                                )) : <p className="text-on-surface-variant">No tienes solicitudes pendientes.</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'earnings' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <GlassCard className="rounded-[24px] p-8 border-l-4 border-l-primary">
                                <p className="text-on-surface-variant font-bold mb-2 text-sm uppercase">Balance Acumulado</p>
                                <p className="font-display-lg text-5xl font-bold text-dark">${earnings.toFixed(2)}</p>
                            </GlassCard>
                            <GlassCard className="rounded-[24px] p-8 border-l-4 border-l-secondary">
                                <p className="text-on-surface-variant font-bold mb-2 text-sm uppercase">Servicios Pagados</p>
                                <p className="font-display-lg text-5xl font-bold text-dark">{requests.filter(r => r.status === 'CONFIRMADO' || r.status === 'COMPLETADO').length}</p>
                            </GlassCard>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <GlassCard className="rounded-[32px] p-8 shadow-md">
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.target;
                                const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
                                const updatedData = {
                                    ...profileForm,
                                    driverLicense: profileForm.driverLicense === 'Sí',
                                    hasCar: profileForm.hasCar === 'Sí',
                                    smoker: profileForm.smoker === 'Sí',
                                    superpowers: selectedSuperpowers,
                                    comfortableWith: selectedComfortable,
                                    availability: availability
                                };
                                const updatedUsers = allUsers.map(u => {
                                    if (u.id?.toString() === user.id?.toString()) {
                                        return { ...u, ...updatedData };
                                    }
                                    return u;
                                });
                                localStorage.setItem('users', JSON.stringify(updatedUsers));
                                
                                // Update session
                                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                const finalUser = { ...currentUser, ...updatedData };
                                localStorage.setItem('user', JSON.stringify(finalUser));
                                
                                setModal({
                                    isOpen: true,
                                    title: "Perfil Guardado",
                                    message: "Tus cambios se han guardado con éxito y son visibles para los padres.",
                                    type: 'success'
                                });
                            }}>
                                <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Nombre</label><input type="text" name="full_name" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.full_name} onChange={handleFormChange}/></div>
                                <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Edad</label><input type="number" name="age" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.age} onChange={handleFormChange}/></div>
                                <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Tarifa ($/hr)</label><input type="number" name="rate" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.rate} onChange={handleFormChange}/></div>
                                <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Experiencia (años)</label><input type="number" name="experience" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.experience} onChange={handleFormChange}/></div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold mb-2 uppercase text-outline">Descripción</label><textarea name="description" className="w-full p-3 rounded-xl bg-surface-container-low h-20 border border-outline-variant" value={profileForm.description} onChange={handleFormChange}></textarea></div>
                                
                                {/* Availability */}
                                <div className="md:col-span-2"><label className="block text-xs font-bold mb-2 uppercase text-outline">Disponibilidad Semanal</label>
                                    <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-low p-4">
                                        <table className="w-full text-center">
                                            <thead><tr><th></th>{days.map(d => <th key={d} className="p-2 text-xs font-bold">{d}</th>)}</tr></thead>
                                            <tbody>{times.map(t => (<tr key={t}><td className="p-2 text-[10px] font-bold text-left uppercase text-outline">{timeLabels[t]}</td>{days.map(d => (<td key={d} className="p-2"><input type="checkbox" className="w-5 h-5 rounded" checked={availability[d][t]} onChange={() => setAvailability(prev => ({...prev, [d]: {...prev[d], [t]: !prev[d][t]}}))}/></td>))}</tr>))}</tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Options Selectors */}
                                <div className="md:col-span-2"><label className="block text-xs font-bold mb-2 uppercase text-outline">Mis Superpoderes</label>
                                    <div className="flex flex-wrap gap-2">{superpowerOptions.map(opt => (<button key={opt} type="button" onClick={() => toggleOption(selectedSuperpowers, setSelectedSuperpowers, opt)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${selectedSuperpowers.includes(opt) ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-outline-variant'}`}>{selectedSuperpowers.includes(opt) && <Check size={12}/>}{opt}</button>))}</div>
                                </div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold mb-2 uppercase text-outline">Cómoda con</label>
                                    <div className="flex flex-wrap gap-2">{comfortableOptions.map(opt => (<button key={opt} type="button" onClick={() => toggleOption(selectedComfortable, setSelectedComfortable, opt)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${selectedComfortable.includes(opt) ? 'bg-secondary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-outline-variant'}`}>{selectedComfortable.includes(opt) && <Check size={12}/>}{opt}</button>))}</div>
                                </div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold mb-2 uppercase text-outline">Educación y Certificaciones</label>
                                    <select name="education" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.education} onChange={handleFormChange}>{educationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                                </div>

                                <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Carnet Conducir</label><select name="driverLicense" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.driverLicense} onChange={handleFormChange}><option>Sí</option><option>No</option></select></div>
                                <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Coche Propio</label><select name="hasCar" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.hasCar} onChange={handleFormChange}><option>Sí</option><option>No</option></select></div>
                                <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Fumador</label><select name="smoker" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.smoker} onChange={handleFormChange}><option>No</option><option>Sí</option></select></div>
                                <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Lugar Trabajo</label><select name="preferredLocation" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.preferredLocation} onChange={handleFormChange}><option>En casa de la familia</option><option>En mi casa</option></select></div>
                                <button type="submit" className="md:col-span-2 bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg hover:scale-105 transition mt-4">Guardar Cambios del Perfil</button>
                            </form>
                        </GlassCard>
                    )}
                    </>
                )}
                </main>
            </div>

            <CustomModal 
                isOpen={modal.isOpen}
                onClose={() => {
                    setModal({ ...modal, isOpen: false });
                    window.location.reload();
                }}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
        </div>
    );
};

export default SitterDashboard;
