import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import GlassCard from '../../components/common/GlassCard';
import { User, Calendar, Star, Camera } from 'lucide-react';
import CustomModal from '../../components/common/CustomModal';

const ParentDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('bookings');
    const [bookings, setBookings] = useState([]);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });
    const [profileForm, setProfileForm] = useState({
        full_name: '',
        city: '',
        kids_count: '',
        kids_ages: '',
        family_desc: '',
        needs: '',
        budget: '',
        payment_pref: 'Transferencia / Depósito'
    });

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        const fetchBookings = () => {
            const reqs = JSON.parse(localStorage.getItem('booking_requests') || '[]');
            const myBookings = reqs.filter(r => r.parentId === (user?.id || 'parent1'));
            setBookings(myBookings);
        };
        
        if (user) {
            fetchBookings();
            setProfileForm({
                full_name: user.full_name || '',
                city: user.city || '',
                kids_count: user.kids_count || '',
                kids_ages: user.kids_ages || '',
                family_desc: user.family_desc || '',
                needs: user.needs || '',
                budget: user.budget || '',
                payment_pref: user.payment_pref || 'Transferencia / Depósito'
            });
        }
        
        window.addEventListener('storage', fetchBookings);
        return () => window.removeEventListener('storage', fetchBookings);
    }, [user]);

    const handlePay = (id) => {
        localStorage.setItem('booking_requests', JSON.stringify(updated));
        setBookings(updated.filter(r => r.parentId === (user?.id || 'parent1')));
        setModal({
            isOpen: true,
            title: "Pago Exitoso",
            message: "Tu pago ha sido procesado. El servicio ahora está marcado como completado.",
            type: 'success'
        });
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'COMPLETADO': return 'bg-green-100 text-green-700';
            case 'PENDIENTE': return 'bg-yellow-100 text-yellow-700';
            case 'ACEPTADA': return 'bg-blue-100 text-blue-700';
            case 'PAGADO': return 'bg-purple-100 text-purple-700';
            case 'CONFIRMADO': return 'bg-primary-fixed-dim text-primary';
            case 'RECHAZADA': return 'bg-red-100 text-red-700';
            case 'CANCELADO': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'COMPLETADO': return 'Completado';
            case 'PENDIENTE': return 'Esperando Respuesta';
            case 'ACEPTADA': return 'Aceptada - Pendiente de Pago';
            case 'PAGADO': return 'Pagado - Esperando Verificación';
            case 'CONFIRMADO': return 'Reserva Confirmada';
            case 'RECHAZADA': return 'Rechazada';
            case 'CANCELADO': return 'Cancelado';
            default: return status;
        }
    };

    const handleAction = (id, newStatus) => {
        const reqs = JSON.parse(localStorage.getItem('booking_requests') || '[]');
        const updated = reqs.map(r => r.id === id ? { ...r, status: newStatus } : r);
        localStorage.setItem('booking_requests', JSON.stringify(updated));
        setBookings(updated.filter(r => r.parentId === (user?.id || 'parent1')));
        window.dispatchEvent(new Event('storage'));
    };

    const handleUploadReceipt = (id) => {
        // Simulating receipt upload
        handleAction(id, 'PAGADO');
        setModal({
            isOpen: true,
            title: "Comprobante Subido",
            message: "El cuidador verificará tu pago en breve. ¡Gracias!",
            type: 'success'
        });
    };

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <Navbar />
            <div className="container mx-auto px-4 pt-28 pb-12 flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <aside className="w-full md:w-64 flex-shrink-0">
                    <GlassCard className="rounded-[32px] p-6 shadow-xl sticky top-28">
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group mb-4">
                                <div className="w-24 h-24 rounded-full bg-primary-fixed-dim flex items-center justify-center text-primary text-3xl font-bold overflow-hidden border-2 border-primary">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.full_name?.charAt(0) || 'P'
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                                    <Camera size={16} />
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    const base64 = reader.result;
                                                    
                                                    // Update users list
                                                    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
                                                    const updatedUsers = allUsers.map(u => u.id === user.id ? { ...u, avatar: base64 } : u);
                                                    localStorage.setItem('users', JSON.stringify(updatedUsers));
                                                    
                                                    // Update current session user
                                                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                                    localStorage.setItem('user', JSON.stringify({ ...currentUser, avatar: base64 }));
                                                    
                                                    setModal({
                                                        isOpen: true,
                                                        title: "Foto Actualizada",
                                                        message: "Tu foto de perfil familiar ha sido guardada correctamente.",
                                                        type: 'success'
                                                    });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }} 
                                    />
                                </label>
                            </div>
                            <h2 className="font-display-lg text-xl font-bold text-center">{user?.full_name}</h2>
                            <p className="text-on-surface-variant text-sm text-center">Padre</p>
                        </div>

                        <nav className="flex flex-col gap-2">
                            <button 
                                onClick={() => setActiveTab('bookings')}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${activeTab === 'bookings' ? 'bg-primary text-white shadow-md' : 'hover:bg-surface-container'}`}
                            >
                                <Calendar size={20} /> Mis Contrataciones
                            </button>
                            <button 
                                onClick={() => setActiveTab('profile')}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'hover:bg-surface-container'}`}
                            >
                                <User size={20} /> Mi Perfil
                            </button>
                        </nav>
                    </GlassCard>
                </aside>

                {/* Main Content */}
                <main className="flex-1">
                    {!user ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'bookings' && (
                        <div>
                            <h2 className="font-display-lg text-3xl font-bold text-primary mb-6">Mis Contrataciones</h2>
                            <div className="space-y-4">
                                {bookings.map(booking => (
                                    <GlassCard key={booking.id} className="rounded-[24px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md hover:shadow-lg transition-shadow">
                                        <div className="flex-1">
                                            <h3 className="font-display-lg text-xl font-bold mb-1">{booking.sitter_name}</h3>
                                            <p className="text-on-surface-variant text-sm flex items-center gap-4">
                                                <span><Calendar className="inline mr-1" size={14}/> {booking.date}</span>
                                                <span>{booking.hours} horas</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="font-bold text-lg">${(booking.total || 0).toFixed(2)}</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(booking.status)}`}>
                                                {getStatusLabel(booking.status)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-2 min-w-[150px]">
                                            {booking.status === 'ACEPTADA' && (
                                                <div className="flex flex-col gap-2">
                                                    <div className="bg-surface-container p-3 rounded-xl text-xs border border-outline-variant/30">
                                                        <p className="font-bold mb-1">Datos de Pago:</p>
                                                        <p>Bancario: BCP 191-xxxxxx</p>
                                                        <p>Yape/QR: 987 654 321</p>
                                                    </div>
                                                    <button onClick={() => handleUploadReceipt(booking.id)} className="bg-primary text-white px-4 py-2 rounded-full text-sm font-bold shadow-md hover:bg-primary-container transition">
                                                        Subir Comprobante
                                                    </button>
                                                </div>
                                            )}
                                            {booking.status === 'CONFIRMADO' && (
                                                <button onClick={() => handleAction(booking.id, 'COMPLETADO')} className="bg-secondary text-white px-4 py-2 rounded-full text-sm font-bold shadow-md hover:bg-secondary-container transition">
                                                    Finalizar Servicio
                                                </button>
                                            )}
                                            {booking.status === 'COMPLETADO' && (
                                                <button className="bg-secondary-fixed text-on-secondary-fixed px-4 py-2 rounded-full text-sm font-bold shadow-md hover:bg-secondary-fixed-dim transition flex items-center gap-1">
                                                    <Star size={14}/> Reseñar
                                                </button>
                                            )}
                                            {(booking.status === 'PENDIENTE' || booking.status === 'ACEPTADA') && (
                                                <button onClick={() => handleAction(booking.id, 'CANCELADO')} className="text-error text-xs font-bold hover:underline">
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div>
                            <h2 className="font-display-lg text-3xl font-bold text-primary mb-6">Mi Perfil Familiar</h2>
                            <GlassCard className="rounded-[32px] p-8 shadow-md">
                                <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => {
                                    e.preventDefault();
                                    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
                                    const updatedData = { ...profileForm };
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
                                        message: "Los datos de tu familia se han actualizado correctamente.",
                                        type: 'success'
                                    });
                                }}>
                                    <div className="md:col-span-2 flex items-center gap-6 mb-4">
                                        <div className="w-24 h-24 rounded-full bg-surface-dim border-2 border-primary flex items-center justify-center overflow-hidden">
                                            <span className="text-on-surface-variant text-sm text-center px-2">Click para subir foto</span>
                                        </div>
                                        <button type="button" className="bg-surface-container-highest px-4 py-2 rounded-xl text-sm font-bold shadow-sm">Cambiar Foto</button>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Nombre del Padre/Madre</label>
                                        <input type="text" name="full_name" className="w-full p-4 rounded-xl border-none bg-surface-container-low" value={profileForm.full_name} onChange={handleFormChange} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Ubicación (Dirección)</label>
                                        <input type="text" name="city" className="w-full p-4 rounded-xl border-none bg-surface-container-low" value={profileForm.city} onChange={handleFormChange} placeholder="Ej: Calle Principal 123" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Número de Hijos</label>
                                        <input type="number" name="kids_count" className="w-full p-4 rounded-xl border-none bg-surface-container-low" value={profileForm.kids_count} onChange={handleFormChange} placeholder="Ej: 2" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Edades de los hijos</label>
                                        <input type="text" name="kids_ages" className="w-full p-4 rounded-xl border-none bg-surface-container-low" value={profileForm.kids_ages} onChange={handleFormChange} placeholder="Ej: 3 y 5 años" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Descripción de la Familia</label>
                                        <textarea name="family_desc" className="w-full p-4 rounded-xl border-none bg-surface-container-low h-24" value={profileForm.family_desc} onChange={handleFormChange} placeholder="Cuéntanos sobre tu familia..."></textarea>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Necesidades Específicas</label>
                                        <input type="text" name="needs" className="w-full p-4 rounded-xl border-none bg-surface-container-low" value={profileForm.needs} onChange={handleFormChange} placeholder="Ej: Alergia al maní, autismo, etc." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Presupuesto Estimado /hr</label>
                                        <input type="number" name="budget" className="w-full p-4 rounded-xl border-none bg-surface-container-low" value={profileForm.budget} onChange={handleFormChange} placeholder="Ej: 15" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Método de Pago Preferido</label>
                                        <select name="payment_pref" className="w-full p-4 rounded-xl border-none bg-surface-container-low" value={profileForm.payment_pref} onChange={handleFormChange}>
                                            <option>Transferencia / Depósito</option>
                                            <option>Pago con QR</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="md:col-span-2 bg-primary text-white px-8 py-4 rounded-full font-bold self-start mt-4 shadow-lg hover:bg-primary-container transition">
                                        Guardar Perfil Completo
                                    </button>
                                </form>
                            </GlassCard>
                        </div>
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

export default ParentDashboard;
