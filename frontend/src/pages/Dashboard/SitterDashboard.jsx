import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import GlassCard from '../../components/common/GlassCard';
import { Calendar, Clock, DollarSign, Star, Camera, Check, Eye, Trash2, Edit, AlertTriangle, MapPin, Briefcase, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomModal from '../../components/common/CustomModal';
import api from '../../services/api';

const SitterDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('requests');
    const [requests, setRequests] = useState([]);
    const [earnings, setEarnings] = useState(0);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Services states
    const [myServices, setMyServices] = useState([]);
    const [isAddingService, setIsAddingService] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [serviceForm, setServiceForm] = useState({
        title: '',
        category: 'Cuidado General / Juegos',
        rate: '',
        description: ''
    });
    
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
        city: '',
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

    const handleDeleteAccount = async () => {
        try {
            await api.delete('/users/account');
            setShowDeleteConfirm(false);
            logout();
        } catch(err) {
            console.error(err);
        }
    };

    const refreshServices = async () => {
        if (!user) return;
        try {
            const response = await api.get(`/services?sitter_id=${user.id}`);
            if (response.data && response.data.success) {
                const mapped = response.data.data.map(s => ({
                    ...s,
                    rate: s.hourly_rate
                }));
                setMyServices(mapped);
            }
        } catch (err) {
            console.error('Error fetching services:', err);
        }
    };

    const refreshData = async () => {
        if (!user) return;
        try {
            const response = await api.get('/bookings/my');
            if (response.data && response.data.success) {
                const mappedReqs = response.data.data.map(b => {
                    let status = b.status.toUpperCase();
                    if (b.status === 'awaiting_payment' && b.payment_status === 'pending') {
                        status = 'PAGADO';
                    } else if (b.status === 'awaiting_payment' || b.status === 'accepted') {
                        status = 'ACEPTADA';
                    } else if (b.status === 'confirmed') {
                        status = 'CONFIRMADO';
                    } else if (b.status === 'completed') {
                        status = 'COMPLETADO';
                    } else if (b.status === 'rejected') {
                        status = 'RECHAZADA';
                    } else if (b.status === 'cancelled') {
                        status = 'CANCELADO';
                    } else if (b.status === 'pending') {
                        status = 'PENDIENTE';
                    }
                    
                    return {
                        id: b.id,
                        parentId: b.parent_id,
                        parentName: b.parent_name || 'Padre',
                        sitterId: b.sitter_id,
                        status: status,
                        date: b.start_datetime ? b.start_datetime.split('T')[0] : '',
                        hours: b.total_hours,
                        total: b.total_amount,
                        serviceTitle: b.message || 'Cuidado General',
                    };
                });
                setRequests(mappedReqs);
                
                const completed = mappedReqs.filter(r => r.status === 'COMPLETADO' || r.status === 'CONFIRMADO');
                const total = completed.reduce((acc, r) => acc + (r.total * 0.9), 0);
                setEarnings(total);
            }
            refreshServices();
        } catch(err) {
            console.error(err);
        }
    };

    const handleSaveService = async (e) => {
        e.preventDefault();
        if (!serviceForm.title || !serviceForm.description || !serviceForm.rate) {
            setModal({
                isOpen: true,
                title: "Error",
                message: "Por favor, completa todos los campos obligatorios del servicio.",
                type: 'error'
            });
            return;
        }

        try {
            if (editingService) {
                const response = await api.put(`/services/${editingService.id}`, {
                    title: serviceForm.title,
                    description: serviceForm.description,
                    category: serviceForm.category,
                    hourly_rate: Number(serviceForm.rate)
                });
                
                setModal({
                    isOpen: true,
                    title: "Servicio Actualizado",
                    message: response.data.message || "Tus cambios se han guardado con éxito.",
                    type: 'success'
                });
            } else {
                await api.post('/services', {
                    title: serviceForm.title,
                    description: serviceForm.description,
                    category: serviceForm.category,
                    hourly_rate: Number(serviceForm.rate)
                });

                setModal({
                    isOpen: true,
                    title: "Servicio Creado",
                    message: "Tu servicio especializado ha sido creado con éxito. Se encuentra en estado 'Pendiente' de revisión por el administrador antes de ser visible para los padres.",
                    type: 'success'
                });
            }

            setIsAddingService(false);
            setEditingService(null);
            setServiceForm({ title: '', category: 'Cuidado General / Juegos', rate: '', description: '' });
            refreshServices();
        } catch (err) {
            console.error(err);
            setModal({
                isOpen: true,
                title: "Error",
                message: "No se pudo guardar el servicio. Intenta de nuevo.",
                type: 'error'
            });
        }
    };

    const handleDeleteService = async (id) => {
        try {
            await api.delete(`/services/${id}`);
            setModal({
                isOpen: true,
                title: "Servicio Eliminado",
                message: "El servicio ha sido removido exitosamente del catálogo.",
                type: 'success'
            });
            refreshServices();
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const loadDashboard = async () => {
            if (!user) return;
            try {
                await refreshData();
                
                // Fetch profile from backend
                const profileResponse = await api.get('/users/profile');
                if (profileResponse.data && profileResponse.data.success) {
                    const dbUser = profileResponse.data.data;
                    
                    setAvailability(dbUser.availability || {
                        LUN: { manana: false, mediodia: false, tarde: false, noche: false },
                        MAR: { manana: false, mediodia: false, tarde: false, noche: false },
                        MIE: { manana: false, mediodia: false, tarde: false, noche: false },
                        JUE: { manana: false, mediodia: false, tarde: false, noche: false },
                        VIE: { manana: false, mediodia: false, tarde: false, noche: false },
                        SAB: { manana: false, mediodia: false, tarde: false, noche: false },
                        DOM: { manana: false, mediodia: false, tarde: false, noche: false },
                    });
                    setSelectedSuperpowers(dbUser.superpowers || []);
                    setSelectedComfortable(dbUser.comfortableWith || dbUser.comfortable_with || []);
                    setProfileImage(dbUser.avatar_url || dbUser.avatar || null);
                    
                    setProfileForm({
                        full_name: dbUser.full_name || '',
                        city: dbUser.city || '',
                        age: dbUser.age || '',
                        rate: dbUser.rate || dbUser.hourly_rate || '',
                        experience: dbUser.experience || dbUser.experience_years || '',
                        description: dbUser.description || '',
                        education: dbUser.education || 'Estudiante Universitario',
                        driverLicense: dbUser.driverLicense ? 'Sí' : 'No',
                        hasCar: dbUser.hasCar ? 'Sí' : 'No',
                        smoker: dbUser.smoker ? 'Sí' : 'No',
                        preferredLocation: dbUser.preferredLocation || 'En casa de la familia'
                    });
                }
            } catch (err) {
                console.error('Error loading dashboard data:', err);
            }
        };
        
        loadDashboard();
        const interval = setInterval(() => {
            refreshData();
        }, 5000);
        return () => clearInterval(interval);
    }, [user]);

    const handleAction = async (id, newStatus) => {
        try {
            if (newStatus === 'ACEPTADA') {
                await api.put(`/bookings/${id}/accept`);
            } else if (newStatus === 'RECHAZADA') {
                await api.put(`/bookings/${id}/reject`, { reason: 'No disponible' });
            } else if (newStatus === 'CONFIRMADO') {
                await api.put(`/bookings/${id}/confirm`);
            }
            refreshData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleImageUpload = async (e) => {
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
                    setProfileImage(avatarUrl);
                    
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({ ...currentUser, avatar: avatarUrl }));
                    
                    setModal({
                        isOpen: true,
                        title: "Foto Actualizada",
                        message: "Tu nueva foto de perfil se ha guardado correctamente.",
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
                    <GlassCard className="rounded-[32px] p-6 shadow-xl md:sticky md:top-28">
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
                            <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'hover:bg-surface-container'}`}><Star size={20} /> Mi Perfil Profesional</button>
                            <button onClick={() => setActiveTab('services')} className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${activeTab === 'services' ? 'bg-primary text-white shadow-md' : 'hover:bg-surface-container'}`}><Briefcase size={20} /> Mis Servicios</button>
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
                                            <div className="font-bold text-xl text-primary">Bs. {req.total}</div>
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
                                <p className="font-display-lg text-5xl font-bold text-dark">Bs. {earnings.toFixed(2)}</p>
                            </GlassCard>
                            <GlassCard className="rounded-[24px] p-8 border-l-4 border-l-secondary">
                                <p className="text-on-surface-variant font-bold mb-2 text-sm uppercase">Servicios Pagados</p>
                                <p className="font-display-lg text-5xl font-bold text-dark">{requests.filter(r => r.status === 'CONFIRMADO' || r.status === 'COMPLETADO').length}</p>
                            </GlassCard>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div>
                            <h2 className="font-display-lg text-3xl font-bold text-primary mb-6">Mi Perfil Profesional</h2>
                            
                            {!isEditingProfile ? (
                                !(profileForm.age || profileForm.rate || profileForm.experience || profileForm.description) ? (
                                    <GlassCard className="rounded-[32px] p-8 shadow-md text-center py-12">
                                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                                            <Star size={32} />
                                        </div>
                                        <h3 className="font-display-lg text-2xl font-bold mb-3">Aún no has completado tu perfil profesional</h3>
                                        <p className="text-on-surface-variant max-w-md mx-auto mb-8 text-sm leading-relaxed">
                                            Completa tu información para que los padres puedan ver tus tarifas, disponibilidad y habilidades especiales al buscar cuidadores.
                                        </p>
                                        <button 
                                            onClick={() => setIsEditingProfile(true)}
                                            className="bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-primary-container transition active:scale-95"
                                        >
                                            Completar Perfil Profesional
                                        </button>
                                    </GlassCard>
                                ) : (
                                    <GlassCard className="rounded-[32px] p-8 shadow-md">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-outline-variant/20">
                                            <div>
                                                <h3 className="font-display-lg text-2xl font-bold">{profileForm.full_name || 'Cuidador Profesional'}</h3>
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

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Tarifa por Hora</p>
                                                <p className="font-bold text-lg text-primary">Bs. {profileForm.rate || '0.00'}/hr</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Experiencia</p>
                                                <p className="font-bold text-lg">{profileForm.experience || 0} años</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Edad</p>
                                                <p className="font-bold text-lg">{profileForm.age || 0} años</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Descripción Profesional</p>
                                                <p className="text-on-surface-variant leading-relaxed text-sm italic">
                                                    "{profileForm.description || 'Sin descripción disponible.'}"
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                    <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Detalles Personales</p>
                                                    <ul className="space-y-2 text-sm">
                                                        <li className="flex justify-between"><span>Educación:</span> <span className="font-bold">{profileForm.education}</span></li>
                                                        <li className="flex justify-between"><span>Carnet de conducir:</span> <span className="font-bold">{profileForm.driverLicense}</span></li>
                                                        <li className="flex justify-between"><span>Coche propio:</span> <span className="font-bold">{profileForm.hasCar}</span></li>
                                                        <li className="flex justify-between"><span>Fumador:</span> <span className="font-bold">{profileForm.smoker}</span></li>
                                                        <li className="flex justify-between"><span>Lugar de trabajo preferido:</span> <span className="font-bold">{profileForm.preferredLocation}</span></li>
                                                    </ul>
                                                </div>

                                                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Mis Superpoderes</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {selectedSuperpowers.length > 0 ? (
                                                                selectedSuperpowers.map(p => <span key={p} className="px-2.5 py-1 bg-secondary-fixed text-on-secondary-fixed rounded-full text-xs font-bold">{p}</span>)
                                                            ) : (
                                                                <span className="text-xs text-on-surface-variant italic">Ninguno seleccionado</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Cómoda con</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {selectedComfortable.length > 0 ? (
                                                                selectedComfortable.map(c => <span key={c} className="px-2.5 py-1 bg-error-container text-on-error-container rounded-full text-xs font-bold">{c}</span>)
                                                            ) : (
                                                                <span className="text-xs text-on-surface-variant italic">Ninguno seleccionado</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-3">Disponibilidad Semanal</p>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-center text-sm border-collapse">
                                                        <thead>
                                                            <tr>
                                                                <th className="p-2 border-b border-outline-variant/20"></th>
                                                                {days.map(d => <th key={d} className="p-2 border-b border-outline-variant/20 font-bold text-xs">{d}</th>)}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {times.map(t => (
                                                                <tr key={t}>
                                                                    <td className="p-2 border-b border-outline-variant/10 text-left font-bold text-[11px] text-on-surface-variant uppercase">{timeLabels[t]}</td>
                                                                    {days.map(d => (
                                                                        <td key={d} className="p-2 border-b border-outline-variant/10">
                                                                            <div className={`w-5 h-5 mx-auto rounded-md ${availability[d][t] ? 'bg-secondary' : 'bg-surface-dim'}`}></div>
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-3">Ubicación de Trabajo / Mapa</p>
                                                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl mb-4 border border-primary/20">
                                                    <MapPin className="text-primary shrink-0" size={20} />
                                                    <div>
                                                        <p className="text-xs font-bold uppercase text-primary">Zona de Cobertura Confirmada</p>
                                                        <p className="text-on-surface font-semibold text-xs">{profileForm.city || 'No especificada'}</p>
                                                    </div>
                                                </div>
                                                <div className="w-full h-64 rounded-xl overflow-hidden border border-outline-variant/30 shadow-inner">
                                                    <iframe 
                                                        title="Mapa de mi ubicación de trabajo"
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
                                            const updatedData = {
                                                ...profileForm,
                                                driverLicense: profileForm.driverLicense === 'Sí',
                                                hasCar: profileForm.hasCar === 'Sí',
                                                smoker: profileForm.smoker === 'Sí',
                                                superpowers: selectedSuperpowers,
                                                comfortableWith: selectedComfortable,
                                                availability: availability
                                            };
                                            
                                            await api.put('/users/profile', updatedData);
                                            
                                            // Update session
                                            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                            localStorage.setItem('user', JSON.stringify({ ...currentUser, ...updatedData }));
                                            
                                            setIsEditingProfile(false);
                                            setModal({
                                                isOpen: true,
                                                title: "Perfil Guardado",
                                                message: "Tus cambios se han guardado con éxito y son visibles para los padres.",
                                                type: 'success'
                                            });
                                        } catch (err) {
                                            console.error('Error saving profile:', err);
                                        }
                                    }}>
                                        <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Nombre</label><input type="text" name="full_name" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.full_name} onChange={handleFormChange}/></div>
                                        <div>
                                            <label className="block text-xs font-bold mb-2 uppercase text-outline">Ciudad / Ubicación</label>
                                            <input type="text" name="city" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.city} onChange={handleFormChange} placeholder="Ej: Calle Bolívar, Cochabamba" />
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
                                        <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Edad</label><input type="number" name="age" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.age} onChange={handleFormChange}/></div>
                                        <div><label className="block text-xs font-bold mb-2 uppercase text-outline">Tarifa (Bs./hr)</label><input type="number" name="rate" className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant" value={profileForm.rate} onChange={handleFormChange}/></div>
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
                                        
                                        <div className="md:col-span-2 flex gap-4 mt-4">
                                            <button type="submit" className="flex-1 bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-container transition active:scale-95">
                                                Guardar Cambios del Perfil
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

                    {activeTab === 'services' && (
                        <div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="font-display-lg text-3xl font-bold text-primary">Mis Servicios Especializados</h2>
                                    <p className="text-on-surface-variant text-sm mt-1">Registra y administra los servicios específicos que ofreces a las familias.</p>
                                </div>
                                {!isAddingService && !editingService && (
                                    <button 
                                        onClick={() => {
                                            setEditingService(null);
                                            setServiceForm({ title: '', category: 'Cuidado General / Juegos', rate: '', description: '' });
                                            setIsAddingService(true);
                                        }}
                                        className="bg-primary text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-md hover:bg-primary-container transition active:scale-95"
                                    >
                                        <Plus size={20} /> Registrar Nuevo Servicio
                                    </button>
                                )}
                            </div>

                            {/* Form for Add / Edit */}
                            {(isAddingService || editingService) ? (
                                <GlassCard className="rounded-[32px] p-8 shadow-md max-w-2xl">
                                    <h3 className="font-display-lg text-2xl font-bold mb-6 text-primary border-b border-outline-variant/20 pb-4">
                                        {editingService ? 'Editar Servicio Especializado' : 'Registrar Nuevo Servicio Especializado'}
                                    </h3>
                                    <form onSubmit={handleSaveService} className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold mb-2 uppercase text-outline">Título del Servicio *</label>
                                            <input 
                                                type="text" 
                                                required
                                                placeholder="Ej: Estimulación Psicomotriz y Estimulación de Lactantes"
                                                className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors"
                                                value={serviceForm.title}
                                                onChange={(e) => setServiceForm({...serviceForm, title: e.target.value})}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold mb-2 uppercase text-outline">Categoría del Servicio *</label>
                                                <select 
                                                    className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors font-sans"
                                                    value={serviceForm.category}
                                                    onChange={(e) => setServiceForm({...serviceForm, category: e.target.value})}
                                                >
                                                    <option value="Cuidado General / Juegos">Cuidado General / Juegos</option>
                                                    <option value="Cuidado Especial / Estimulación">Cuidado Especial / Estimulación</option>
                                                    <option value="Apoyo Escolar / Tareas">Apoyo Escolar / Tareas</option>
                                                    <option value="Cuidado Nocturno / Fin de Semana">Cuidado Nocturno / Fin de Semana</option>
                                                    <option value="Otros Servicios">Otros Servicios</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold mb-2 uppercase text-outline">Tarifa del Servicio (Bs. por hora) *</label>
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-3 text-on-surface-variant font-bold text-sm">Bs.</span>
                                                    <input 
                                                        type="number" 
                                                        required
                                                        min="1"
                                                        placeholder="35"
                                                        className="w-full p-3 pl-11 rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors font-bold"
                                                        value={serviceForm.rate}
                                                        onChange={(e) => setServiceForm({...serviceForm, rate: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold mb-2 uppercase text-outline">Descripción Detallada *</label>
                                            <textarea 
                                                required
                                                placeholder="Describe en qué consiste el servicio, metodologías que utilizas, materiales incluidos y la experiencia específica que tienes..."
                                                rows="4"
                                                className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors text-sm leading-relaxed"
                                                value={serviceForm.description}
                                                onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                                            ></textarea>
                                        </div>

                                        {editingService && (
                                            <div className="flex gap-2 items-start p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs">
                                                <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                                                <p>
                                                    <strong>Nota importante:</strong> Modificar el título, la categoría, la tarifa o la descripción del servicio revocará su visibilidad pública y obligará a que el administrador vuelva a validarlo para asegurar la calidad de la oferta en la plataforma.
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-4">
                                            <button 
                                                type="submit" 
                                                className="flex-1 bg-primary text-white py-3.5 rounded-full font-bold shadow-lg hover:bg-primary-container transition active:scale-95"
                                            >
                                                {editingService ? 'Actualizar y Guardar' : 'Registrar Servicio'}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    setIsAddingService(false);
                                                    setEditingService(null);
                                                    setServiceForm({ title: '', category: 'Cuidado General / Juegos', rate: '', description: '' });
                                                }}
                                                className="flex-1 bg-surface-container text-on-surface-variant py-3.5 rounded-full font-bold hover:bg-surface-container-highest transition"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                </GlassCard>
                            ) : (
                                /* Listing */
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {myServices.length > 0 ? (
                                        myServices.map(service => (
                                            <GlassCard key={service.id} className="rounded-[28px] p-6 shadow-md hover:shadow-lg transition-all relative border border-outline-variant/20 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start gap-2 mb-3">
                                                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                                                            {service.category}
                                                        </span>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                            service.status === 'approved' 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : service.status === 'rejected'
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {service.status === 'approved' 
                                                                ? 'Aprobado' 
                                                                : service.status === 'rejected'
                                                                    ? 'Rechazado'
                                                                    : 'Pendiente'}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-display-lg text-lg font-bold text-dark mb-2">{service.title}</h3>
                                                    <p className="text-on-surface-variant text-sm mb-4 leading-relaxed line-clamp-3">
                                                        {service.description}
                                                    </p>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                                                    <div className="font-bold text-lg text-primary">
                                                        Bs. {service.rate} <span className="text-xs text-on-surface-variant font-normal">/ hora</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingService(service);
                                                                setServiceForm({
                                                                    title: service.title,
                                                                    category: service.category,
                                                                    rate: service.rate,
                                                                    description: service.description
                                                                });
                                                            }}
                                                            className="p-2 rounded-full bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white transition"
                                                            title="Editar servicio"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteService(service.id)}
                                                            className="p-2 rounded-full bg-error-container text-on-error-container hover:bg-error hover:text-white transition"
                                                            title="Eliminar servicio"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </GlassCard>
                                        ))
                                    ) : (
                                        <div className="md:col-span-2 text-center py-12">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                                                <Briefcase size={28} />
                                            </div>
                                            <p className="text-on-surface font-bold text-lg">No has registrado ningún servicio especializado</p>
                                            <p className="text-on-surface-variant text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                                                Añade servicios específicos para destacar tus habilidades (estimulación, tareas, etc.) y permitir que los padres te contraten para ello.
                                            </p>
                                        </div>
                                    )}
                                </div>
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
