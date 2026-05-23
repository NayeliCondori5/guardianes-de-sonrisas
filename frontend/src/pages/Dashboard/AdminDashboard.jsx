import React, { useState, useEffect } from 'react';
import Navbar from '../../components/common/Navbar';
import GlassCard from '../../components/common/GlassCard';
import { Users, BookOpen, DollarSign, Activity, Clock, Trash2, Edit, Plus, Search, X, AlertTriangle, Check, Briefcase, CheckCircle, ShieldCheck, ShieldOff } from 'lucide-react';
import api from '../../services/api';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        parents: 0,
        sitters: 0,
        activeReservations: 0,
        totalIncome: 0,
        pendingPayments: 0
    });
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [recentActivity, setRecentActivity] = useState([]);
    const [paymentsBySitter, setPaymentsBySitter] = useState([]);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'delete'
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        role: 'parent',
        city: '',
        age: '',
        rate: '',
        description: '',
        experience: ''
    });

    // Admin Tabs & Services state
    const [activeTab, setActiveTab] = useState('general');
    const [services, setServices] = useState([]);
    const [allSitters, setAllSitters] = useState([]);

    const refreshServices = async () => {
        try {
            const response = await api.get('/services?status=pending');
            if (response.data && response.data.success) {
                const mapped = response.data.data.map(s => ({
                    ...s,
                    rate: s.hourly_rate
                }));
                setServices(mapped);
            }
        } catch (err) {
            console.error('Error fetching pending services:', err);
        }
    };

    const refreshSitters = async () => {
        try {
            const response = await api.get('/admin/sitters');
            if (response.data && response.data.success) {
                setAllSitters(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching sitters:', err);
        }
    };

    const handleVerifySitter = async (sitterId, newVerifiedState) => {
        try {
            await api.put(`/admin/sitters/${sitterId}/verify`, { is_verified: newVerifiedState });
            refreshSitters();
        } catch (err) {
            console.error('Error updating sitter verification:', err);
        }
    };

    const handleValidateService = async (id, newStatus) => {
        try {
            await api.put(`/services/${id}/validate`, { status: newStatus });
            refreshServices();
            refreshData();
        } catch (err) {
            console.error('Error validating service:', err);
        }
    };

    const refreshData = async () => {
        try {
            // 1. Get users
            const usersResponse = await api.get('/admin/users');
            let allUsers = [];
            if (usersResponse.data && usersResponse.data.success) {
                allUsers = usersResponse.data.data;
                setUsers(allUsers);
            }

            // 2. Get bookings
            const bookingsResponse = await api.get('/admin/bookings');
            let allBookings = [];
            if (bookingsResponse.data && bookingsResponse.data.success) {
                allBookings = bookingsResponse.data.data;
            }

            // 3. Get pending services
            refreshServices();

            // 4b. Get all sitters for verification tab
            refreshSitters();

            // 4. Get stats
            const statsResponse = await api.get('/admin/stats');
            if (statsResponse.data && statsResponse.data.success) {
                const s = statsResponse.data.data;
                setStats({
                    totalUsers: s.users.total,
                    parents: s.users.parents,
                    sitters: s.users.sitters,
                    activeReservations: allBookings.filter(b => b.status === 'confirmed').length,
                    totalIncome: s.revenue.total_fees,
                    pendingPayments: s.payments.pending
                });
            }

            // 5. Calculate paymentsBySitter
            const completed = allBookings.filter(b => b.status === 'completed');
            const sitterMap = {};
            completed.forEach(r => {
                if(!sitterMap[r.sitterName]) {
                    sitterMap[r.sitterName] = { name: r.sitterName, totalGenerated: 0, commission: 0, completedJobs: 0 };
                }
                sitterMap[r.sitterName].totalGenerated += r.total_amount;
                sitterMap[r.sitterName].commission += r.platform_fee;
                sitterMap[r.sitterName].completedJobs += 1;
            });
            setPaymentsBySitter(Object.values(sitterMap));

            // 6. Calculate recentActivity
            const activity = allBookings.map(r => ({
                id: r.id,
                time: 'Reciente',
                title: r.status === 'completed' ? 'Reserva Completada' : r.status === 'confirmed' ? 'Reserva Confirmada' : 'Actividad',
                desc: r.status === 'completed' 
                    ? `${r.parentName} pagó Bs. ${r.total_amount} (Comisión: Bs. ${r.platform_fee.toFixed(2)})`
                    : `${r.parentName} solicitó a ${r.sitterName}`,
                color: r.status === 'completed' ? 'bg-secondary' : r.status === 'confirmed' ? 'bg-primary' : 'bg-yellow-500'
            })).slice(0, 5);
            setRecentActivity(activity);

        } catch (err) {
            console.error('Error refreshing admin data:', err);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    const openModal = (mode, user = null) => {
        setModalMode(mode);
        setSelectedUser(user);
        
        if (mode === 'edit' && user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                role: user.role || 'parent',
                city: user.city || '',
                age: user.age || '',
                rate: user.rate || '',
                description: user.description || '',
                experience: user.experience || ''
            });
        } else {
            setFormData({
                full_name: '',
                email: '',
                role: 'parent',
                city: '',
                age: '',
                rate: '',
                description: '',
                experience: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            if (modalMode === 'add') {
                await api.post('/admin/users', formData);
            } else if (modalMode === 'edit') {
                await api.put(`/admin/users/${selectedUser.id}`, formData);
            } else if (modalMode === 'delete') {
                await api.delete(`/admin/users/${selectedUser.id}`);
            }
            setIsModalOpen(false);
            refreshData();
        } catch (err) {
            console.error('Error updating users:', err);
        }
    };

    const filteredUsers = users.filter(u => 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <Navbar />
            <div className="pt-28 pb-12 px-4 md:px-10 max-w-[1280px] mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="font-display-lg text-4xl font-bold text-primary">Panel de Control General</h1>
                        <p className="text-on-surface-variant text-lg">Gestión global de Guardianes de Sonrisas</p>
                    </div>
                    <span className="bg-primary-fixed text-primary px-4 py-2 rounded-full font-bold text-sm">Modo Administrador</span>
                </div>

                {/* Admin Sub-Tabs */}
                <div className="flex border-b border-outline-variant/30 mb-8 gap-4 overflow-x-auto pb-2">
                    <button 
                        onClick={() => setActiveTab('general')} 
                        className={`pb-3 font-bold text-sm transition-all px-4 ${activeTab === 'general' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        General & Usuarios
                    </button>
                    <button 
                        onClick={() => setActiveTab('validate-services')} 
                        className={`pb-3 font-bold text-sm transition-all px-4 flex items-center gap-1.5 ${activeTab === 'validate-services' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        Validación de Servicios 
                        {services.filter(s => s.status === 'pending').length > 0 && (
                            <span className="px-2 py-0.5 bg-error text-white text-[10px] rounded-full">
                                {services.filter(s => s.status === 'pending').length}
                            </span>
                        )}
                    </button>
                    <button 
                        onClick={() => { setActiveTab('verify-sitters'); refreshSitters(); }} 
                        className={`pb-3 font-bold text-sm transition-all px-4 flex items-center gap-1.5 ${activeTab === 'verify-sitters' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        <ShieldCheck size={15} /> Verificar Cuidadores
                        {allSitters.filter(s => !s.is_verified).length > 0 && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] rounded-full">
                                {allSitters.filter(s => !s.is_verified).length}
                            </span>
                        )}
                    </button>

                </div>

                {/* General Dashboard Content */}
                {activeTab === 'general' && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                            <GlassCard className="rounded-[24px] p-6 flex items-center gap-4 border-l-4 border-l-primary">
                                <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <p className="text-on-surface-variant font-bold text-sm uppercase tracking-wide">Usuarios Totales</p>
                                    <p className="font-display-lg text-3xl font-bold">{stats.totalUsers}</p>
                                    <p className="text-xs text-on-surface-variant mt-1">{stats.parents} Padres | {stats.sitters} Cuidadores</p>
                                </div>
                            </GlassCard>

                            <GlassCard className="rounded-[24px] p-6 flex items-center gap-4 border-l-4 border-l-secondary">
                                <div className="w-14 h-14 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <p className="text-on-surface-variant font-bold text-sm uppercase tracking-wide">Reservas Activas</p>
                                    <p className="font-display-lg text-3xl font-bold">{stats.activeReservations}</p>
                                    <p className="text-xs text-on-surface-variant mt-1">Estado: CONFIRMADO</p>
                                </div>
                            </GlassCard>

                            <GlassCard className="rounded-[24px] p-6 flex items-center gap-4 border-l-4 border-l-error">
                                <div className="w-14 h-14 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <p className="text-on-surface-variant font-bold text-sm uppercase tracking-wide">Ingresos (10%)</p>
                                    <p className="font-display-lg text-3xl font-bold">Bs. {stats.totalIncome.toFixed(2)}</p>
                                    <p className="text-xs text-on-surface-variant mt-1">Servicios COMPLETADOS</p>
                                </div>
                            </GlassCard>
                        </div>

                        {/* User Management Section */}
                        <GlassCard className="rounded-[32px] p-8 mb-10">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                                <h2 className="font-display-lg text-2xl font-bold flex items-center gap-2">
                                    <Users className="text-primary"/> Gestión de Usuarios
                                </h2>
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar usuario..." 
                                            className="w-full pl-10 pr-4 py-2 rounded-full border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => openModal('add')}
                                        className="bg-primary text-white p-2 rounded-full hover:bg-primary-container transition active:scale-95 shadow-md flex items-center gap-2 px-4"
                                    >
                                        <Plus size={20} /> <span className="text-sm font-bold">Agregar</span>
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-outline-variant/30 text-xs font-bold text-outline uppercase tracking-wider">
                                            <th className="p-4">Usuario</th>
                                            <th className="p-4">Email</th>
                                            <th className="p-4">Rol</th>
                                            <th className="p-4">Ciudad</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id} className="border-b border-outline-variant/10 hover:bg-primary/5 transition-colors group">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                            {u.full_name?.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-on-surface">{u.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-on-surface-variant">{u.email}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                        u.role === 'admin' ? 'bg-error-container text-error' :
                                                        u.role === 'sitter' ? 'bg-secondary-container text-on-secondary-container' :
                                                        'bg-primary-container text-on-primary-container'
                                                    }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-on-surface-variant">
                                                    {u.city || '---'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openModal('edit', u)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition" title="Editar">
                                                            <Edit size={18} />
                                                        </button>
                                                        <button onClick={() => openModal('delete', u)} className="p-2 text-error hover:bg-error/10 rounded-lg transition" title="Eliminar">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="p-10 text-center text-on-surface-variant">No se encontraron usuarios.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>

                        {/* Additional Stats Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <GlassCard className="rounded-[32px] p-8 lg:col-span-2">
                                <h2 className="font-display-lg text-2xl font-bold mb-6 flex items-center gap-2"><DollarSign className="text-primary"/> Desglose de Pagos por Cuidador</h2>
                                {paymentsBySitter.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b-2 border-outline-variant/30">
                                                    <th className="p-3 font-bold text-on-surface-variant uppercase text-sm">Cuidador</th>
                                                    <th className="p-3 font-bold text-on-surface-variant uppercase text-sm">Trabajos</th>
                                                    <th className="p-3 font-bold text-on-surface-variant uppercase text-sm">Generado</th>
                                                    <th className="p-3 font-bold text-primary uppercase text-sm">Comisión (10%)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paymentsBySitter.map((s, idx) => (
                                                    <tr key={idx} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition">
                                                        <td className="p-3 font-bold">{s.name}</td>
                                                        <td className="p-3">{s.completedJobs}</td>
                                                        <td className="p-3">Bs. {s.totalGenerated.toFixed(2)}</td>
                                                        <td className="p-3 font-bold text-primary">Bs. {s.commission.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-on-surface-variant text-center py-4">No hay pagos procesados.</p>
                                )}
                            </GlassCard>

                            <GlassCard className="rounded-[32px] p-8">
                                <h2 className="font-display-lg text-2xl font-bold mb-6 flex items-center gap-2"><Clock className="text-primary"/> Esperando Pago</h2>
                                <div className="space-y-4">
                                    {stats.pendingPayments > 0 ? (
                                        <p className="text-center text-sm text-on-surface-variant mt-2 font-bold text-error">Hay {stats.pendingPayments} solicitudes en estado PAGADO esperando validación.</p>
                                    ) : (
                                        <p className="text-center text-sm text-on-surface-variant mt-2">No hay pagos pendientes.</p>
                                    )}
                                </div>
                            </GlassCard>

                            <GlassCard className="rounded-[32px] p-8">
                                <h2 className="font-display-lg text-2xl font-bold mb-6 flex items-center gap-2"><Activity className="text-secondary"/> Actividad Real Reciente</h2>
                                <div className="relative border-l-2 border-outline-variant/50 ml-4 space-y-6">
                                    {recentActivity.length > 0 ? recentActivity.map((act, i) => (
                                        <div key={i} className="relative pl-6">
                                            <div className={`absolute w-3 h-3 ${act.color} rounded-full left-[-7px] top-1`}></div>
                                            <p className="font-bold">{act.title}</p>
                                            <p className="text-sm text-outline">{act.desc}</p>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-on-surface-variant ml-4">Sin actividad.</p>
                                    )}
                                </div>
                            </GlassCard>
                        </div>
                    </>
                )}

                {/* Validation of Services Section */}
                {activeTab === 'validate-services' && (
                    <GlassCard className="rounded-[32px] p-8 mb-10">
                        <div className="mb-8">
                            <h2 className="font-display-lg text-2xl font-bold flex items-center gap-2">
                                <Briefcase className="text-primary"/> Validación de Servicios Especializados
                            </h2>
                            <p className="text-on-surface-variant text-sm mt-1">
                                Audita, aprueba o rechaza los servicios registrados por los cuidadores para garantizar la calidad en la plataforma.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {services.filter(s => s.status === 'pending').length > 0 ? (
                                services.filter(s => s.status === 'pending').map(service => (
                                    <GlassCard key={service.id} className="rounded-[28px] p-6 shadow-md border border-outline-variant/20 flex flex-col justify-between hover:shadow-lg transition-all">
                                        <div>
                                            <div className="flex justify-between items-start gap-2 mb-3">
                                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                                                    {service.category}
                                                </span>
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
                                                    Pendiente
                                                </span>
                                            </div>
                                            <h3 className="font-display-lg text-lg font-bold text-dark mb-1">{service.title}</h3>
                                            <p className="text-xs text-on-surface-variant mb-3">
                                                Ofrecido por: <span className="font-bold text-dark">{service.sitter_name || 'Cuidador'}</span>
                                            </p>
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
                                                    onClick={() => handleValidateService(service.id, 'approved')}
                                                    className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-primary-container transition active:scale-95 shadow-sm flex items-center gap-1"
                                                >
                                                    <Check size={14} /> Aprobar
                                                </button>
                                                <button 
                                                    onClick={() => handleValidateService(service.id, 'rejected')}
                                                    className="bg-error-container text-on-error-container px-4 py-2 rounded-full text-xs font-bold hover:bg-error hover:text-white transition active:scale-95 shadow-sm flex items-center gap-1"
                                                >
                                                    <X size={14} /> Rechazar
                                                </button>
                                            </div>
                                        </div>
                                    </GlassCard>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-12">
                                    <div className="w-16 h-16 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={28} />
                                    </div>
                                    <p className="text-on-surface font-bold text-lg">No hay servicios pendientes de validación</p>
                                    <p className="text-on-surface-variant text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                                        ¡Excelente! Todos los servicios registrados en la plataforma han sido moderados correctamente.
                                    </p>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                )}

                {/* Verify Sitters Tab */}
                {activeTab === 'verify-sitters' && (
                    <GlassCard className="rounded-[32px] p-8 mb-10">
                        <div className="mb-8">
                            <h2 className="font-display-lg text-2xl font-bold flex items-center gap-2">
                                <ShieldCheck className="text-primary"/> Verificación de Cuidadores
                            </h2>
                            <p className="text-on-surface-variant text-sm mt-1">
                                Solo los cuidadores verificados pueden recibir solicitudes de contratación. Revisa y aprueba o revoca la verificación de cada cuidador.
                            </p>
                        </div>

                        {allSitters.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-on-surface-variant">No hay cuidadores registrados.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-outline-variant/30 text-xs font-bold text-outline uppercase tracking-wider">
                                            <th className="p-4">Cuidador</th>
                                            <th className="p-4">Ciudad</th>
                                            <th className="p-4">Tarifa</th>
                                            <th className="p-4">Exp.</th>
                                            <th className="p-4 text-center">Estado</th>
                                            <th className="p-4 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allSitters.map((s) => (
                                            <tr key={s.id} className="border-b border-outline-variant/10 hover:bg-primary/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-sm overflow-hidden">
                                                            {s.avatar_url 
                                                                ? <img src={s.avatar_url} alt={s.full_name} className="w-full h-full object-cover" />
                                                                : s.full_name?.charAt(0)
                                                            }
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-on-surface">{s.full_name}</p>
                                                            <p className="text-xs text-on-surface-variant">{s.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-on-surface-variant">{s.city || '---'}</td>
                                                <td className="p-4 text-sm font-bold text-primary">Bs. {s.hourly_rate || '---'}/hr</td>
                                                <td className="p-4 text-sm text-on-surface-variant">{s.experience_years ? `${s.experience_years} años` : '---'}</td>
                                                <td className="p-4 text-center">
                                                    {s.is_verified ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container">
                                                            <ShieldCheck size={12} /> Verificado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                            <ShieldOff size={12} /> Sin verificar
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {s.is_verified ? (
                                                        <button
                                                            onClick={() => handleVerifySitter(s.id, false)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-error-container text-on-error-container rounded-full text-xs font-bold hover:bg-error hover:text-white transition active:scale-95"
                                                        >
                                                            <ShieldOff size={13} /> Revocar
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleVerifySitter(s.id, true)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-full text-xs font-bold hover:bg-primary-container transition active:scale-95 shadow-sm"
                                                        >
                                                            <ShieldCheck size={13} /> Verificar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </GlassCard>
                )}

            </div>

            {/* Modal de Gestión de Usuarios */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <GlassCard className={`w-full max-w-2xl rounded-[40px] shadow-2xl relative overflow-hidden animate-in zoom-in duration-300 ${modalMode === 'delete' ? 'border-t-8 border-t-error' : 'border-t-8 border-t-primary'}`}>
                        {/* Header */}
                        <div className="p-8 pb-4 flex justify-between items-center border-b border-outline-variant/20 bg-surface-container-low/50">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl ${modalMode === 'delete' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                                    {modalMode === 'add' ? <Plus size={24} /> : modalMode === 'edit' ? <Edit size={24} /> : <AlertTriangle size={24} />}
                                </div>
                                <div>
                                    <h2 className={`font-display-lg text-2xl font-bold ${modalMode === 'delete' ? 'text-error' : 'text-dark'}`}>
                                        {modalMode === 'add' ? 'Nuevo Guardián' : modalMode === 'edit' ? 'Editar Perfil' : 'Confirmar Eliminación'}
                                    </h2>
                                    <p className="text-xs text-on-surface-variant font-medium uppercase tracking-widest">
                                        {modalMode === 'delete' ? 'Acción Irreversible' : 'Gestión de Credenciales'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Body - Scrollable */}
                        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {modalMode !== 'delete' ? (
                                <form id="admin-user-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
                                            <Users size={14}/> Nombre Completo
                                        </label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="Ej: Maria Lopez"
                                            className="w-full p-4 rounded-2xl border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
                                            <Search size={14}/> Email de Acceso
                                        </label>
                                        <input 
                                            type="email" 
                                            required
                                            placeholder="ejemplo@correo.com"
                                            className="w-full p-4 rounded-2xl border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
                                            <Activity size={14}/> Rol en la Plataforma
                                        </label>
                                        <select 
                                            className="w-full p-4 rounded-2xl border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-primary transition-all font-bold appearance-none cursor-pointer"
                                            value={formData.role}
                                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                                        >
                                            <option value="parent">Padre / Madre</option>
                                            <option value="sitter">Cuidador / Niñera</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>
                                    <div className={formData.role === 'sitter' ? 'md:col-span-1' : 'md:col-span-2'}>
                                        <label className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
                                            <Clock size={14}/> Ciudad / Ubicación
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej: Sucre, Bolivia"
                                            className="w-full p-4 rounded-2xl border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                            value={formData.city}
                                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                                        />
                                    </div>

                                    {formData.role === 'sitter' && (
                                        <>
                                            <div>
                                                <label className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                                                    <Users size={14}/> Edad
                                                </label>
                                                <input 
                                                    type="number" 
                                                    className="w-full p-4 rounded-2xl border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-secondary transition-all font-medium"
                                                    value={formData.age}
                                                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                                                    <DollarSign size={14}/> Tarifa (Bs./hr)
                                                </label>
                                                <input 
                                                    type="number" 
                                                    className="w-full p-4 rounded-2xl border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-secondary transition-all font-medium"
                                                    value={formData.rate}
                                                    onChange={(e) => setFormData({...formData, rate: e.target.value})}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                                                    <Activity size={14}/> Años de Experiencia
                                                </label>
                                                <input 
                                                    type="number" 
                                                    className="w-full p-4 rounded-2xl border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-secondary transition-all font-medium"
                                                    value={formData.experience}
                                                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                                                    <BookOpen size={14}/> Descripción Corta (Bio)
                                                </label>
                                                <textarea 
                                                    className="w-full p-4 rounded-2xl border border-outline-variant bg-surface-container-low outline-none focus:ring-2 focus:ring-secondary transition-all h-28 font-medium italic"
                                                    placeholder="Cuenta brevemente su trayectoria..."
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                                />
                                            </div>
                                        </>
                                    )}
                                </form>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-on-surface-variant text-lg">¿Estás seguro de que deseas eliminar a <strong>{selectedUser?.full_name}</strong>?</p>
                                    <p className="text-sm text-error mt-2 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                        <AlertTriangle size={16}/> Esta acción es permanente
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer - Sticky Actions */}
                        <div className="p-8 border-t border-outline-variant/20 bg-surface-container-low/50 flex gap-4">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-8 py-4 rounded-full font-bold bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition shadow-sm active:scale-95"
                            >
                                Cancelar
                            </button>
                            {modalMode !== 'delete' ? (
                                <button 
                                    form="admin-user-form"
                                    type="submit"
                                    className="flex-[2] bg-primary text-white py-4 rounded-full font-bold shadow-xl hover:bg-primary-container hover:shadow-primary/20 transition active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={20}/> {modalMode === 'add' ? 'Crear Nuevo Registro' : 'Guardar Cambios'}
                                </button>
                            ) : (
                                <button 
                                    onClick={handleSubmit}
                                    className="flex-[2] bg-error text-white py-4 rounded-full font-bold shadow-xl hover:bg-error/90 transition active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={20}/> Eliminar Permanentemente
                                </button>
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
