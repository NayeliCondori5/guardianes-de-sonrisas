import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import GlassCard from '../components/common/GlassCard';
import { useAuth } from '../context/AuthContext';
import { MapPin, Star, ShieldCheck, ShieldOff, Heart, Car, Home, Cigarette, BookOpen, Briefcase, X } from 'lucide-react';
import CustomModal from '../components/common/CustomModal';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
// Helper to map date and time to sitter availability
const DAYS_ABBR = ['DOM','LUN','MAR','MIE','JUE','VIE','SAB'];
const getTimeBlock = (time) => {
  const [hour] = time.split(':').map(Number);
  if (hour >= 6 && hour < 12) return 'manana';
  if (hour >= 12 && hour < 15) return 'mediodia';
  if (hour >= 15 && hour < 19) return 'tarde';
  return 'noche';
};
const TIME_BLOCK_START = { manana: '08:00', mediodia: '12:00', tarde: '16:00', noche: '20:00' };
const TIME_BLOCK_END = { manana: '12:00', mediodia: '15:00', tarde: '20:00', noche: '23:00' };
const MAX_HOURS_PER_DAY = 8;
import api from '../services/api';

const SitterProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sitter, setSitter] = useState(null);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });
    const [sitterServices, setSitterServices] = useState([]);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [bookingForm, setBookingForm] = useState({
        date: '',
        timeBlock: 'manana',
        startTime: '',
        hours: 4,
        selectedServiceId: 'default',
        numChildren: 1
    });

    useEffect(() => {
        const fetchSitterDetails = async () => {
            try {
                // Fetch sitter profile details from backend
                const sitterResponse = await api.get(`/sitters/${id}`);
                if (sitterResponse.data && sitterResponse.data.success) {
                    const data = sitterResponse.data.data;
                    
                    const avgRating = data.reviews && data.reviews.length > 0
                        ? (data.reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / data.reviews.length).toFixed(1)
                        : (data.rating || 0).toFixed(1);

                    setSitter({
                        ...data,
                        name: data.full_name,
                        avatar: data.avatar_url || '/child1.png',
                        city: data.city || 'Ciudad no especificada',
                        rate: data.hourly_rate || 15,
                        age: data.age || 25,
                        rating: parseFloat(avgRating),
                        description: data.description || 'Cuidador apasionado y responsable.',
                        superpowers: data.superpowers || ['Manualidades', 'Leer a niños', 'Música', 'Juegos creativos'],
                        comfortableWith: data.comfortable_with || ['Mascotas', 'Ayuda con tarea', 'Cocinar'],
                        education: data.education || 'Licenciatura en Educación Infantil',
                        hasCar: data.has_car !== undefined ? !!data.has_car : true,
                        driverLicense: data.driver_license !== undefined ? !!data.driver_license : true,
                        smoker: data.smoker !== undefined ? !!data.smoker : false,
                        preferredLocation: data.preferred_location || 'En casa de la familia',
                        lastActive: 'Hace 2 horas',
                        experience: data.experience_years || 3,
                        availability: data.availability || {
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
                
                // Fetch approved services from backend
                const servicesResponse = await api.get(`/services?sitter_id=${id}&status=approved`);
                if (servicesResponse.data && servicesResponse.data.success) {
                    const servicesData = servicesResponse.data.data.map(s => ({
                        ...s,
                        rate: s.hourly_rate // map rate key for profile page UI
                    }));
                    setSitterServices(servicesData);
                }
            } catch (err) {
                console.error('Error fetching sitter details:', err);
            }
        };
        
        fetchSitterDetails();
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

        // Prepopulate tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setBookingForm({
            date: tomorrow.toISOString().split('T')[0],
            timeBlock: 'manana',
            startTime: TIME_BLOCK_START['manana'],
            hours: 4,
            selectedServiceId: 'default',
            numChildren: 1
        });
        setIsBookingModalOpen(true);
    };

    const submitBookingRequest = async () => {
  if (bookingForm.hours > MAX_HOURS_PER_DAY) {
    setModal({
      isOpen: true,
      title: 'Límite de horas',
      message: `No puedes reservar más de ${MAX_HOURS_PER_DAY} horas por día.`,
      type: 'error'
    });
    return;
  }
        try {
            // Validate availability based on sitter's weekly schedule
            const selectedDate = new Date(bookingForm.date);
            const dayAbbr = DAYS_ABBR[selectedDate.getDay()]; // getDay: 0=Sunday
            const timeBlock = bookingForm.timeBlock;
            if (!sitter.availability?.[dayAbbr]?.[timeBlock]) {
                setModal({
                    isOpen: true,
                    title: "Horario no disponible",
                    message: `El cuidador no está disponible el ${dayAbbr} en la franja ${timeBlock}. Por favor elige otro día u hora.`,
                    type: 'error'
                });
                return;
            }

            const isDefault = bookingForm.selectedServiceId === 'default';
            const activeService = isDefault 
                ? null 
                : sitterServices.find(s => s.id === bookingForm.selectedServiceId);
                
            const message = activeService 
                ? `Servicio Especializado: ${activeService.title}` 
                : 'Cuidado General';
            
            // Build dynamic start and end datetime based on selected date, startTime, and duration hours
            const startTimeStr = bookingForm.startTime || TIME_BLOCK_START[timeBlock] || '08:00';
            const start = `${bookingForm.date}T${startTimeStr}:00`;
            const startDate = new Date(start);
            const endDate = new Date(startDate.getTime() + bookingForm.hours * 60 * 60 * 1000);
            const end = endDate.toISOString().slice(0,19);
            // Validate that end time does not exceed block end
            const blockEndStr = TIME_BLOCK_END[timeBlock] || '23:59';
            const blockEnd = new Date(`${bookingForm.date}T${blockEndStr}:00`);
            if (endDate > blockEnd) {
                setModal({
                    isOpen: true,
                    title: 'Horario excedido',
                    message: `El servicio finaliza después de la franja ${timeBlock}. Por favor reduce la duración o elige otro bloque.`,
                    type: 'error'
                });
                return;
            }

             await api.post('/bookings', {
                 sitter_id: id,
                 start_datetime: start,
                 end_datetime: end,
                 total_hours: bookingForm.hours,
                 num_children: bookingForm.numChildren,
                 message: message
             });

            setIsBookingModalOpen(false);
            setModal({
                isOpen: true,
                title: "¡Solicitud Enviada!",
                message: `Has solicitado a ${sitter.name} para el servicio. El cuidador recibirá una notificación en su panel.`,
                type: 'success'
            });
        } catch (err) {
            console.error('Error submitting booking request:', err);
            const serverMessage = err.response?.data?.message;
            setModal({
                isOpen: true,
                title: "Error",
                message: serverMessage || "No se pudo registrar la solicitud. Por favor intenta de nuevo.",
                type: 'error'
            });
        }
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
                        <div className="flex justify-center items-center text-secondary mt-2">
                            <Star size={18} style={{fill: 'currentColor'}}/>
                            <span className="text-dark font-bold ml-1 text-base">{sitter.rating}</span>
                        </div>
                        <div className="flex justify-center items-center gap-4 mt-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">Bs. {sitter.rate}</p>
                                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Por hora</p>
                            </div>
                            <div className="w-px h-8 bg-outline-variant/30"></div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-dark">{sitter.age}</p>
                                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Años</p>
                            </div>
                        </div>

                        {sitter.verified ? (
                            <button onClick={handleRequest} className="w-full mt-8 bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-container transition active:scale-95 text-lg">
                                SOLICITAR NIÑERA
                            </button>
                        ) : (
                            <div className="mt-8">
                                <button disabled className="w-full bg-surface-container-highest text-on-surface-variant py-4 rounded-full font-bold shadow-sm text-lg cursor-not-allowed">
                                    SOLICITAR NIÑERA
                                </button>
                                <p className="text-xs text-error font-bold mt-2 text-center flex items-center justify-center gap-1">
                                    <ShieldOff size={14} /> Cuidador aún no verificado
                                </p>
                            </div>
                        )}
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

                    {/* Servicios Especializados */}
                    <GlassCard className="rounded-[32px] p-8 shadow-xl">
                        <h2 className="font-display-lg text-2xl font-bold text-primary mb-6 flex items-center gap-2">
                            <Briefcase className="text-primary" /> Servicios Especializados de {sitter.name}
                        </h2>
                        
                        {sitterServices.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sitterServices.map((service) => (
                                    <div 
                                        key={service.id} 
                                        className="p-5 rounded-2xl bg-surface-container border border-outline-variant/30 hover:border-primary/50 transition flex flex-col justify-between"
                                    >
                                        <div>
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold mb-2 inline-block">
                                                {service.category}
                                            </span>
                                            <h3 className="font-bold text-lg text-dark mb-1">{service.title}</h3>
                                            <p className="text-on-surface-variant text-sm mb-4 leading-relaxed line-clamp-3">
                                                {service.description}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-outline-variant/10">
                                            <div className="font-bold text-primary text-base">
                                                Bs. {service.rate} <span className="text-xs text-on-surface-variant font-normal">/ hr</span>
                                            </div>
                                            {sitter.verified ? (
                                                <button 
                                                    onClick={() => {
                                                        if (!user) {
                                                            handleRequest();
                                                            return;
                                                        }
                                                        setBookingForm({
                                                            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                                                            startTime: '09:00',
                                                            hours: 4,
                                                            selectedServiceId: service.id,
                                                            numChildren: 1
                                                        });
                                                        setIsBookingModalOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-primary text-white rounded-full text-xs font-bold hover:bg-primary-container transition active:scale-95 shadow-sm"
                                                >
                                                    Reservar
                                                </button>
                                            ) : (
                                                <button disabled className="px-3 py-1.5 bg-surface-container-highest text-on-surface-variant rounded-full text-xs font-bold cursor-not-allowed shadow-sm">
                                                    No Verificado
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-on-surface-variant text-sm font-medium">Esta niñera ofrece cuidado general por el momento.</p>
                            </div>
                        )}
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

                    <GlassCard className="rounded-[32px] p-8 shadow-xl">
                        <h2 className="font-display-lg text-2xl font-bold mb-4 flex items-center gap-2">
                            <MapPin className="text-primary" /> Ubicación de Trabajo
                        </h2>

                        <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-2xl mb-6 border border-primary/20 shadow-sm">
                            <MapPin className="text-primary shrink-0" size={24} />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-primary">Zona de Cobertura Confirmada</p>
                                <p className="text-on-surface font-semibold text-sm">{sitter.city || 'No especificada'}</p>
                            </div>
                        </div>

                        <div className="w-full h-64 rounded-2xl overflow-hidden border border-outline-variant/30 shadow-inner">
                            <iframe 
                                title="Mapa de ubicación niñera"
                                width="100%" 
                                height="100%" 
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(sitter.city || 'La Paz, Bolivia')}&t=&z=15&ie=UTF8&output=embed`}
                            ></iframe>
                        </div>
                    </GlassCard>

                    {/* Reseñas de los Padres */}
                    <GlassCard className="rounded-[32px] p-8 shadow-xl">
                        <h2 className="font-display-lg text-2xl font-bold text-primary mb-6 flex items-center gap-2">
                            <Star className="text-secondary" style={{ fill: 'currentColor' }} /> Reseñas de los Padres ({sitter.reviews?.length || 0})
                        </h2>

                        {sitter.reviews && sitter.reviews.length > 0 ? (
                            <div className="space-y-4">
                                {sitter.reviews.map((review, idx) => (
                                    <div key={idx} className="p-5 rounded-2xl bg-surface-container border border-outline-variant/30 flex gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-dim shrink-0 border border-outline-variant/40">
                                            {review.parent_avatar ? (
                                                <img src={review.parent_avatar} alt={review.parent_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm">
                                                    {review.parent_name?.charAt(0) || 'P'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-dark">{review.parent_name || 'Padre de familia'}</h4>
                                                    <div className="flex items-center text-amber-500 mt-0.5 gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star 
                                                                key={star} 
                                                                size={12} 
                                                                className={star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-on-surface-variant/20'} 
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="text-outline text-xs">
                                                    {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                                                </span>
                                            </div>
                                            <p className="text-on-surface-variant text-sm mt-3 leading-relaxed italic">
                                                "{review.comment}"
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-on-surface-variant text-sm font-medium">
                                Aún no hay reseñas para este cuidador.
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
            
            {isBookingModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <GlassCard className="w-full max-w-md rounded-[32px] p-8 shadow-2xl relative animate-in zoom-in duration-300">
                        <button 
                            onClick={() => setIsBookingModalOpen(false)}
                            className="absolute top-6 right-6 p-2 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition"
                        >
                            <X size={18} />
                        </button>
                        
                        <h2 className="font-display-lg text-2xl font-bold mb-2 text-dark flex items-center gap-2">
                            <Briefcase className="text-primary" /> Solicitar a {sitter.name}
                        </h2>
                        <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                            Personaliza los detalles de la solicitud. Si eliges un servicio especializado, se aplicará su tarifa correspondiente.
                        </p>

                        <div className="space-y-4">
                            {/* Selector de Servicio */}
                            <div>
                                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                                    Servicio a Contratar
                                </label>
                                <select 
                                    value={bookingForm.selectedServiceId}
                                    onChange={(e) => setBookingForm({ ...bookingForm, selectedServiceId: e.target.value })}
                                    className="w-full p-3 bg-surface-container text-on-surface border border-outline-variant/30 rounded-2xl focus:outline-none focus:border-primary font-medium"
                                >
                                    <option value="default">Cuidado General (Bs. {sitter.rate}/hora)</option>
                                    {sitterServices.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.title} (Bs. {s.rate}/hora)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Fecha */}
                            <div>
                                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                                    Fecha del Servicio
                                </label>
                                 <input
                                   type="date"
                                   value={bookingForm.date}
                                   onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                                   className="w-full p-3 bg-surface-container text-on-surface border border-outline-variant/30 rounded-2xl focus:outline-none focus:border-primary font-medium"
                                 />
                               </div>
                               <div className="mt-2">
                                 <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Bloque Horario</label>
                                 <select
                                    value={bookingForm.timeBlock}
                                    onChange={(e) => setBookingForm({ ...bookingForm, timeBlock: e.target.value, startTime: TIME_BLOCK_START[e.target.value] })}
                                    className="w-full p-3 bg-surface-container text-on-surface border border-outline-variant/30 rounded-2xl focus:outline-none focus:border-primary font-medium"
                                  >
                                    {Object.entries(sitter.availability?.[DAYS_ABBR[new Date(bookingForm.date).getDay()] ] || {}).map(([block, available]) => (
                                      <option key={block} value={block} disabled={!available}>
                                        {timeLabels[block] || block}
                                      </option>
                                    ))}
                                  </select>
                               </div>

                               <div className="mt-2">
                                   <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Hora de Inicio</label>
                                   <input 
                                       type="time" 
                                       value={bookingForm.startTime || ""}
                                       min={TIME_BLOCK_START[bookingForm.timeBlock]}
                                       max={TIME_BLOCK_END[bookingForm.timeBlock]}
                                       onChange={(e) => setBookingForm({...bookingForm, startTime: e.target.value})}
                                       className="w-full p-3 bg-surface-container text-on-surface border border-outline-variant/30 rounded-2xl focus:outline-none focus:border-primary font-medium"
                                   />
                               </div>

                            {/* Horas */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-primary uppercase tracking-wider">
                                        Duración (Horas)
                                    </label>
                                    <span className="text-sm font-bold text-primary">{bookingForm.hours} horas</span>
                                </div>
                                <input 
                                    type="range"
                                    min="1"
                                    max="12"
                                    value={bookingForm.hours}
                                    onChange={(e) => setBookingForm({ ...bookingForm, hours: parseInt(e.target.value) })}
                                    className="w-full accent-primary h-2 bg-outline-variant/30 rounded-lg appearance-none cursor-pointer"
                                />
                                {/* Número de niños */}
                                <div className="flex justify-between items-center mt-2 mb-2">
                                    <label className="text-xs font-bold text-primary uppercase tracking-wider">
                                        Número de niños
                                    </label>
                                    <span className="text-sm font-bold text-primary">{bookingForm.numChildren} niño(s)</span>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={bookingForm.numChildren}
                                    onChange={(e) => setBookingForm({ ...bookingForm, numChildren: Math.max(1, parseInt(e.target.value) || 1) })}
                                    className="w-full p-2 bg-surface-container text-on-surface border border-outline-variant/30 rounded-2xl focus:outline-none focus:border-primary"
                                />
                            </div>

                            {/* Detalle de Precios */}
                            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm mt-4">
                                <div className="flex justify-between items-center text-sm font-bold text-on-surface mb-1">
                                    <span>Tarifa por hora:</span>
                                    <span className="text-primary">
                                        Bs. {bookingForm.selectedServiceId === 'default' 
                                            ? sitter.rate 
                                            : sitterServices.find(s => s.id === bookingForm.selectedServiceId)?.rate || sitter.rate
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold text-on-surface mb-2">
                                    <span>Horas contratadas:</span>
                                    <span>{bookingForm.hours} horas</span>
                                </div>
                                <div className="w-full h-px bg-outline-variant/20 my-2"></div>
                                <div className="flex justify-between items-center text-lg font-bold text-dark">
                                    <span>Total Estimado:</span>
                                    <span className="text-primary text-xl">
                                        Bs. {(bookingForm.selectedServiceId === 'default' 
                                            ? sitter.rate 
                                            : sitterServices.find(s => s.id === bookingForm.selectedServiceId)?.rate || sitter.rate
                                        ) * bookingForm.hours * bookingForm.numChildren}
                                    </span>
                                </div>
                                <p className="text-[10px] text-outline mt-2 italic">
                                    Fin del servicio: {new Date(new Date(`${bookingForm.date}T${bookingForm.startTime}`).getTime() + (bookingForm.hours * 60 * 60 * 1000)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                         <AvailabilityCalendar availability={sitter.availability} />
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button 
                                onClick={() => setIsBookingModalOpen(false)}
                                className="flex-1 bg-surface-container text-on-surface-variant py-3 rounded-full font-bold hover:bg-surface-container-highest transition active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={submitBookingRequest}
                                className="flex-1 bg-primary text-white py-3 rounded-full font-bold shadow-lg hover:bg-primary-container transition active:scale-95"
                            >
                                Solicitar al cuidador
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            <CustomModal 
                isOpen={modal.isOpen}
                onClose={() => {
                    setModal({ ...modal, isOpen: false });
                    if (modal.title === "¡Solicitud Enviada!") {
                        navigate('/dashboard/parent');
                        window.location.reload();
                    }
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
