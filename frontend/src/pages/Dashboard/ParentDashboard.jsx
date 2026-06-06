import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import GlassCard from '../../components/common/GlassCard';
import { User, Calendar, Star, Camera, Trash2, Edit, AlertTriangle, MapPin } from 'lucide-react';
import CustomModal from '../../components/common/CustomModal';
import api from '../../services/api';

const ParentDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('bookings');
    const [bookings, setBookings] = useState([]);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

    const handleDeleteAccount = async () => {
        try {
            await api.delete('/users/account');
            setShowDeleteConfirm(false);
            logout();
        } catch(err) {
            console.error(err);
        }
    };

    const loadProfile = async () => {
        if (!user) return;
        try {
            const profileResponse = await api.get('/users/profile');
            if (profileResponse.data && profileResponse.data.success) {
                const dbUser = profileResponse.data.data;
                setProfileForm({
                    full_name: dbUser.full_name || '',
                    city: dbUser.city || '',
                    kids_count: dbUser.kids_count || '',
                    kids_ages: dbUser.kids_ages || '',
                    family_desc: dbUser.family_desc || '',
                    needs: dbUser.needs || '',
                    budget: dbUser.budget || '',
                    payment_pref: dbUser.payment_pref || 'Transferencia / Depósito'
                });
            }
        } catch (err) {
            console.error('Error loading parent profile:', err);
        }
    };

    const refreshData = async () => {
        if (!user) return;
        try {
            // Fetch bookings from backend
            const bookingsResponse = await api.get('/bookings/my');
            if (bookingsResponse.data && bookingsResponse.data.success) {
                const mappedBookings = bookingsResponse.data.data.map(b => {
                    let status = b.status.toUpperCase();
                    if (b.status === 'awaiting_payment' && b.payment_status === 'pending') {
                        status = 'PAGADO';
                    } else if (b.status === 'awaiting_payment') {
                        status = 'ACEPTADA';
                    } else if (b.status === 'confirmed') {
                        status = 'CONFIRMADO';
                    } else if (b.status === 'completed') {
                        status = 'COMPLETADO';
                    } else if (b.status === 'rejected') {
                        status = 'RECHAZADA';
                    } else if (b.status === 'cancelled') {
                        status = 'CANCELADO';
                    }
                    
                    return {
                        id: b.id,
                        parentId: b.parent_id,
                        sitterId: b.sitter_id,
                        sitterName: b.sitter_name || 'Cuidador',
                        status: status,
                        date: b.start_datetime ? b.start_datetime.split('T')[0] : '',
                        hours: b.total_hours,
                        total: b.total_amount,
                        serviceTitle: b.message || 'Cuidado General',
                        reviewed: !!b.reviewed
                    };
                });
                setBookings(mappedBookings);
            }
        } catch (err) {
            console.error('Error loading parent dashboard data:', err);
        }
    };

    useEffect(() => {
        loadProfile();
        refreshData();
        const interval = setInterval(() => {
            refreshData();
        }, 5000);
        return () => clearInterval(interval);
    }, [user]);

    const handlePay = async (id) => {
        try {
            await api.post(`/payments/${id}/upload-receipt`, {
                method: 'deposit',
                receipt_url: '/uploads/default-receipt.png'
            });
            refreshData();
            setModal({
                isOpen: true,
                title: "Pago Exitoso",
                message: "Tu pago ha sido registrado. El administrador verificará tu pago en breve.",
                type: 'success'
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmitReview = async (e) => {
        if (e) e.preventDefault();
        if (!selectedBookingForReview) return;

        try {
            await api.post('/reviews', {
                booking_id: selectedBookingForReview.id,
                rating: reviewForm.rating,
                comment: reviewForm.comment
            });
            
            setIsReviewModalOpen(false);
            setReviewForm({ rating: 5, comment: '' });
            setSelectedBookingForReview(null);
            refreshData();

            setModal({
                isOpen: true,
                title: "¡Reseña Guardada!",
                message: `Gracias por calificar el servicio. Tu opinión ayuda a nuestra comunidad.`,
                type: 'success'
            });
        } catch (err) {
            console.error('Error sending review:', err);
            setModal({
                isOpen: true,
                title: "Error",
                message: "No se pudo registrar la reseña. Por favor intenta de nuevo.",
                type: 'error'
            });
        }
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

    const handleAction = async (id, newStatus) => {
        try {
            if (newStatus === 'COMPLETADO') {
                await api.put(`/bookings/${id}/complete`);
            } else if (newStatus === 'CANCELADO') {
                await api.put(`/bookings/${id}/cancel`);
            }
            refreshData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleUploadReceipt = async (id) => {
        try {
            await api.post(`/payments/${id}/upload-receipt`, {
                method: 'deposit',
                receipt_url: '/uploads/default-receipt.png'
            });
            refreshData();
            setModal({
                isOpen: true,
                title: "Comprobante Subido",
                message: "El cuidador y el administrador verificarán tu pago en breve. ¡Gracias!",
                type: 'success'
            });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <Navbar />
            <div className="container mx-auto px-4 pt-28 pb-12 flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <aside className="w-full md:w-64 flex-shrink-0">
                    <GlassCard className="rounded-[32px] p-6 shadow-xl md:sticky md:top-28">
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
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const formData = new FormData();
                                                formData.append('avatar', file);
                                                try {
                                                    const response = await api.post('/users/avatar', formData, {
                                                        headers: { 'Content-Type': 'multipart/form-data' }
                                                    });
                                                    if (response.data && response.data.success) {
                                                        const avatarUrl = response.data.avatar_url;
                                                        
                                                        // Update current session user
                                                        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                                        localStorage.setItem('user', JSON.stringify({ ...currentUser, avatar: avatarUrl }));
                                                        
                                                        setModal({
                                                            isOpen: true,
                                                            title: "Foto Actualizada",
                                                            message: "Tu foto de perfil familiar ha sido guardada correctamente.",
                                                            type: 'success'
                                                        });
                                                    }
                                                } catch (err) {
                                                    console.error('Error uploading image:', err);
                                                    const errMsg = err.response?.data?.message || "No se pudo subir la imagen. Intenta con una imagen más pequeña.";
                                                    setModal({
                                                        isOpen: true,
                                                        title: "Error",
                                                        message: errMsg,
                                                        type: 'error'
                                                    });
                                                }
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
                                        <div className="flex-1 text-center md:text-left">
                                            <h3 className="font-display-lg text-xl font-bold mb-1">{booking.sitterName || booking.sitter_name}</h3>
                                            <p className="text-on-surface-variant text-sm flex flex-wrap justify-center md:justify-start gap-4">
                                                <span className="flex items-center gap-1"><Calendar size={14}/> {booking.date}</span>
                                                <span>{booking.hours} horas</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-center md:items-end gap-2">
                                            <span className="font-bold text-lg">Bs. {(booking.total || 0).toFixed(2)}</span>
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
                                                booking.reviewed ? (
                                                    <span className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-bold text-center border border-purple-200">
                                                        ✓ Reseñado
                                                    </span>
                                                ) : (
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedBookingForReview(booking);
                                                            setReviewForm({ rating: 5, comment: '' });
                                                            setIsReviewModalOpen(true);
                                                        }} 
                                                        className="bg-secondary-fixed text-on-secondary-fixed px-4 py-2 rounded-full text-sm font-bold shadow-md hover:bg-secondary-fixed-dim transition flex items-center justify-center gap-1"
                                                    >
                                                        <Star size={14}/> Reseñar
                                                    </button>
                                                )
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
                            
                            {!isEditingProfile ? (
                                !(profileForm.city || profileForm.kids_count || profileForm.family_desc || profileForm.budget) ? (
                                    <GlassCard className="rounded-[32px] p-8 shadow-md text-center py-12">
                                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                                            <User size={32} />
                                        </div>
                                        <h3 className="font-display-lg text-2xl font-bold mb-3">Aún no has creado tu perfil familiar</h3>
                                        <p className="text-on-surface-variant max-w-md mx-auto mb-8 text-sm leading-relaxed">
                                            Completa la información de tu familia para que los cuidadores y niñeras puedan conocer tus necesidades de cuidado y postularse.
                                        </p>
                                        <button 
                                            onClick={() => setIsEditingProfile(true)}
                                            className="bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-primary-container transition active:scale-95"
                                        >
                                            Crear Perfil Familiar
                                        </button>
                                    </GlassCard>
                                ) : (
                                    <GlassCard className="rounded-[32px] p-8 shadow-md">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-outline-variant/20">
                                            <div>
                                                <h3 className="font-display-lg text-2xl font-bold">{profileForm.full_name || 'Mi Familia'}</h3>
                                                <p className="text-on-surface-variant text-sm flex items-center gap-1 mt-1">
                                                    Ubicación: <span className="font-bold text-dark">{profileForm.city || 'No especificada'}</span>
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setIsEditingProfile(true)}
                                                    className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-md hover:bg-primary-container transition"
                                                >
                                                    <Edit size={16} /> Editar Perfil
                                                </button>
                                                <button 
                                                    onClick={() => setShowDeleteConfirm(true)}
                                                    className="bg-error-container text-on-error-container px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-1.5 hover:bg-error hover:text-white transition"
                                                >
                                                    <Trash2 size={16} /> Eliminar Cuenta
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Presupuesto Estimado</p>
                                                <p className="font-bold text-lg text-primary">Bs. {profileForm.budget || '0.00'}/hr</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Hijos & Edades</p>
                                                <p className="font-bold text-lg">{profileForm.kids_count || 0} hijos ({profileForm.kids_ages || 'edades no especificadas'})</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Necesidades Específicas</p>
                                                <p className="font-bold text-md">{profileForm.needs || 'Ninguna'}</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Método de Pago Preferido</p>
                                                <p className="font-bold text-md">{profileForm.payment_pref}</p>
                                            </div>
                                            <div className="md:col-span-2 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Descripción de la Familia</p>
                                                <p className="text-on-surface-variant leading-relaxed text-sm italic">
                                                    "{profileForm.family_desc || 'Sin descripción disponible.'}"
                                                </p>
                                            </div>
                                            <div className="md:col-span-2 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-3">Ubicación en el Mapa</p>
                                                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl mb-4 border border-primary/20">
                                                    <MapPin className="text-primary shrink-0" size={20} />
                                                    <div>
                                                        <p className="text-xs font-bold uppercase text-primary">Dirección Confirmada</p>
                                                        <p className="text-on-surface font-semibold text-xs">{profileForm.city || 'No especificada'}</p>
                                                    </div>
                                                </div>
                                                <div className="w-full h-64 rounded-xl overflow-hidden border border-outline-variant/30 shadow-inner">
                                                    <iframe 
                                                        title="Mapa de mi ubicación familiar"
                                                        width="100%" 
                                                        height="100%" 
                                                        style={{ border: 0 }}
                                                        loading="lazy"
                                                        allowFullScreen
                                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(profileForm.city || 'La Paz, Bolivia')}&t=&z=15&ie=UTF8&output=embed`}
                                                    ></iframe>
                                                </div>
                                            </div>
                                        </div>
                                    </GlassCard>
                                )
                            ) : (
                                <GlassCard className="rounded-[32px] p-8 shadow-md">
                                    <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={async (e) => {
                                        e.preventDefault();
                                        try {
                                            await api.put('/users/profile', {
                                                ...profileForm
                                            });
                                            
                                            // Update session
                                            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                            localStorage.setItem('user', JSON.stringify({ ...currentUser, ...profileForm }));
                                            
                                            setIsEditingProfile(false);
                                            loadProfile();
                                            setModal({
                                                isOpen: true,
                                                title: "Perfil Guardado",
                                                message: "Los datos de tu familia se han actualizado correctamente.",
                                                type: 'success'
                                            });
                                        } catch (err) {
                                            console.error('Error saving profile:', err);
                                        }
                                    }}>
                                        <div>
                                            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Nombre del Padre/Madre</label>
                                            <input type="text" name="full_name" className="w-full p-4 rounded-xl border-none bg-surface-container-low" value={profileForm.full_name} onChange={handleFormChange} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Ubicación (Dirección)</label>
                                            <input type="text" name="city" className="w-full p-4 rounded-xl border-none bg-surface-container-low" value={profileForm.city} onChange={handleFormChange} placeholder="Ej: Calle Principal 123, Cochabamba" />
                                            {profileForm.city && (
                                                <div className="mt-3 w-full h-40 rounded-xl overflow-hidden border border-outline-variant/30 shadow-inner">
                                                    <iframe 
                                                        title="Vista previa del mapa"
                                                        width="100%" 
                                                        height="100%" 
                                                        style={{ border: 0 }}
                                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(profileForm.city)}&t=&z=15&ie=UTF8&output=embed`}
                                                    ></iframe>
                                                </div>
                                            )}
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
                                        <div className="md:col-span-2 flex gap-4 mt-4">
                                            <button type="submit" className="flex-1 bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-container transition active:scale-95">
                                                Guardar Perfil
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setIsEditingProfile(false)}
                                                className="flex-1 bg-surface-container text-on-surface-variant py-4 rounded-full font-bold hover:bg-surface-container-highest transition"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                </GlassCard>
                            )}
                        </div>
                    )}
                    </>
                )}
                </main>
            </div>

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <GlassCard className="w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative border-t-8 border-t-error text-center animate-in zoom-in duration-300">
                        <div className="mb-4 flex justify-center text-error">
                            <AlertTriangle size={48} />
                        </div>
                        <h2 className="font-display-lg text-2xl font-bold mb-2 text-dark">¿Eliminar tu Cuenta?</h2>
                        <p className="text-on-surface-variant mb-8 leading-relaxed text-sm">
                            Esta acción eliminará de forma permanente tu cuenta de usuario y todos tus datos del sistema. No podrás volver a iniciar sesión.
                        </p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 bg-surface-container text-on-surface-variant py-3 rounded-full font-bold hover:bg-surface-container-highest transition"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleDeleteAccount}
                                className="flex-1 bg-error text-white py-3 rounded-full font-bold shadow-lg hover:bg-error/90 transition"
                            >
                                Eliminar
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {isReviewModalOpen && selectedBookingForReview && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <GlassCard className="w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative border border-outline-variant/30 text-left animate-in zoom-in duration-300">
                        <h2 className="font-display-lg text-2xl font-bold mb-2 text-primary">Calificar Servicio</h2>
                        <p className="text-on-surface-variant text-sm mb-6">
                            Comparte tu experiencia con <strong>{selectedBookingForReview.sitterName}</strong> para el servicio <strong>"{selectedBookingForReview.serviceTitle || 'Cuidado General'}"</strong>.
                        </p>
                        
                        <form onSubmit={handleSubmitReview} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-3">Calificación</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                                            className="transition-transform active:scale-90 duration-150"
                                        >
                                            <Star 
                                                size={36} 
                                                className={`transition-colors duration-200 ${
                                                    star <= reviewForm.rating 
                                                        ? 'fill-amber-400 text-amber-400' 
                                                        : 'text-on-surface-variant/30 hover:text-amber-300'
                                                }`} 
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Comentario / Reseña</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={reviewForm.comment}
                                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                                    placeholder="Cuéntanos qué tal estuvo el servicio, el trato del cuidador, puntualidad, etc..."
                                    className="w-full p-4 rounded-xl border-none bg-surface-container-low focus:ring-2 focus:ring-primary outline-none transition"
                                ></textarea>
                            </div>
                            
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsReviewModalOpen(false);
                                        setSelectedBookingForReview(null);
                                    }}
                                    className="flex-1 bg-surface-container text-on-surface-variant py-4 rounded-full font-bold hover:bg-surface-container-highest transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-container transition active:scale-95"
                                >
                                    Enviar Reseña
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}

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
