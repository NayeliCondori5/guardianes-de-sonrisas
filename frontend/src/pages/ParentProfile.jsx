import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import GlassCard from '../components/common/GlassCard';
import { User, MapPin, Baby, Heart, DollarSign, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const ParentProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [parent, setParent] = useState(null);
    const [bookingRequests, setBookingRequests] = useState([]);
    const [bookingLoading, setBookingLoading] = useState(false);

    useEffect(() => {
        const fetchParent = async () => {
            try {
                // Fetch parent profile
                const response = await api.get(`/users/parent/${id}`);
                if (response.data && response.data.success) {
                    setParent(response.data.data);
                } else {
                    setParent({ error: true });
                }
            } catch (err) {
                console.error('Error fetching parent profile:', err);
                setParent({ error: true });
            }
        };

        const fetchBookings = async () => {
            if (!id) return;
            setBookingLoading(true);
            try {
                const res = await api.get(`/bookings/parent/${id}/pending`);
                if (res.data && res.data.success) {
                    setBookingRequests(res.data.data);
                } else {
                    setBookingRequests([]);
                }
            } catch (err) {
                console.error('Error fetching booking requests:', err);
                setBookingRequests([]);
            } finally {
                setBookingLoading(false);
            }
        };

        fetchParent();
        fetchBookings();
    }, [id]);

    if (!parent) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl animate-pulse">
                <p className="text-primary font-bold text-xl">Cargando perfil del padre...</p>
            </div>
        </div>
    );

    if (parent.error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
            <Navbar />
            <GlassCard className="max-w-md w-full p-8 text-center rounded-[32px] border-t-8 border-t-error">
                <h2 className="text-2xl font-bold text-error mb-4">Usuario no encontrado</h2>
                <p className="text-on-surface-variant mb-6">Lo sentimos, no pudimos encontrar la información de este padre en el sistema.</p>
                <button 
                    onClick={() => navigate(-1)}
                    className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg"
                >
                    Volver Atrás
                </button>
            </GlassCard>
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <Navbar />
            <div className="pt-28 pb-12 px-4 md:px-10 max-w-[1000px] mx-auto">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-primary font-bold mb-6 hover:translate-x-[-4px] transition-transform"
                >
                    <ArrowLeft size={20} /> Volver al Dashboard
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Photo & Basic Info */}
                    <div className="md:col-span-1">
                        <GlassCard className="rounded-[40px] p-8 text-center shadow-2xl border-t-4 border-t-primary md:sticky md:top-28">
                            <div className="w-32 h-32 rounded-full bg-primary-fixed-dim mx-auto mb-6 flex items-center justify-center text-primary text-4xl font-bold overflow-hidden border-4 border-white shadow-lg">
                                {parent.avatar ? (
                                    <img src={parent.avatar} alt={parent.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    parent.full_name?.charAt(0) || 'P'
                                )}
                            </div>
                            <h1 className="font-display-lg text-2xl font-bold mb-2">{parent.full_name}</h1>
                            <p className="text-on-surface-variant font-medium flex items-center justify-center gap-2">
                                <MapPin size={18} className="text-primary"/> {parent.city || 'Ciudad no especificada'}
                            </p>
                            
                            <div className="mt-8 pt-8 border-t border-outline-variant/30 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-on-surface-variant">Hijos:</span>
                                    <span className="font-bold flex items-center gap-1"><Baby size={16} /> {parent.kids_count || 1}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-on-surface-variant">Presupuesto:</span>
                                    <span className="font-bold text-primary">Bs. {parent.budget || '--'}/hr</span>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Right Column: Detailed Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Booking Requests Section */}
                        <GlassCard className="rounded-[32px] p-8 shadow-xl">
                            <h2 className="font-display-lg text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                                <Heart className="text-error" /> Solicitudes de Cuidado Pendientes
                            </h2>
                            {bookingLoading ? (
                                <p className="text-on-surface-variant">Cargando solicitudes...</p>
                            ) : bookingRequests.length > 0 ? (
                                <div className="space-y-4">
                                    {bookingRequests.map((b) => (
                                        <div key={b.id} className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30">
                                            <p className="font-medium text-on-surface mb-1"><span className="font-bold">Servicio:</span> {b.message || 'Cuidado General'}</p>
                                            <p className="text-sm text-on-surface-variant mb-1"><span className="font-bold">Fecha del Servicio:</span> {new Date(b.start_datetime).toLocaleDateString()}</p>
                                            <p className="text-sm text-on-surface-variant mb-1"><span className="font-bold">Bloque Horario:</span> {new Date(b.start_datetime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(b.end_datetime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                            <p className="text-sm text-on-surface-variant mb-1"><span className="font-bold">Duración (Horas):</span> {b.total_hours}</p>
                                            <p className="text-sm text-on-surface-variant mb-1"><span className="font-bold">Número de niños:</span> {b.num_children}</p>
                                            {b.message && <p className="text-sm text-on-surface-variant"><span className="font-bold">Detalle:</span> {b.message}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-on-surface-variant">No hay solicitudes pendientes.</p>
                            )}
                        </GlassCard>

                        <GlassCard className="rounded-[40px] p-8 shadow-xl">
                            <h2 className="font-display-lg text-2xl font-bold mb-6 flex items-center gap-2">
                                <Heart className="text-primary" /> Sobre nuestra familia
                            </h2>
                            <p className="text-on-surface-variant leading-relaxed text-lg mb-6 italic">
                                "{parent.family_desc || 'No hay descripción disponible para esta familia todavía.'}"
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                                <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Edades de los niños</h3>
                                    <p className="font-bold text-lg">{parent.kids_ages || 'No especificado'}</p>
                                </div>
                                <div className="p-4 rounded-3xl bg-secondary/5 border border-secondary/10">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">Necesidades Especiales</h3>
                                    <p className="font-bold text-lg">{parent.needs || 'Ninguna especificada'}</p>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="rounded-[40px] p-8 shadow-xl">
                            <h2 className="font-display-lg text-2xl font-bold mb-6 flex items-center gap-2">
                                <DollarSign className="text-primary" /> Preferencias de Servicio
                            </h2>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <span className="text-on-surface-variant font-medium">Método de pago:</span>
                                    <span className="font-bold">{parent.payment_pref || 'Por definir'}</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <span className="text-on-surface-variant font-medium">Ubicación del cuidado:</span>
                                    <span className="font-bold">Casa de la familia</span>
                                </li>
                            </ul>
                        </GlassCard>

                        <GlassCard className="rounded-[40px] p-8 shadow-xl">
                            <h2 className="font-display-lg text-2xl font-bold mb-4 flex items-center gap-2">
                                <MapPin className="text-primary" /> Ubicación Familiar
                            </h2>
                            
                            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-2xl mb-6 border border-primary/20 shadow-sm">
                                <MapPin className="text-primary shrink-0" size={24} />
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Dirección Registrada</p>
                                    <p className="text-on-surface font-semibold text-sm">{parent.city || 'No especificada'}</p>
                                </div>
                            </div>

                            <div className="w-full h-64 rounded-3xl overflow-hidden border border-outline-variant/30 shadow-inner">
                                <iframe 
                                    title="Mapa de ubicación familiar"
                                    width="100%" 
                                    height="100%" 
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(parent.city || 'La Paz, Bolivia')}&t=&z=15&ie=UTF8&output=embed`}
                                ></iframe>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParentProfile;
