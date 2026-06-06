import React from 'react';
import Navbar from '../components/common/Navbar';
import GlassCard from '../components/common/GlassCard';
import { Heart, Search, UserCheck, CreditCard, Star, ShieldCheck, Briefcase, FileText, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const HowItWorks = () => {
    return (
        <div className="bg-background text-on-surface font-body-md overflow-x-hidden min-h-screen">
            <Navbar />
            
            <main className="pt-[100px] pb-20">
                {/* Hero / Header Section */}
                <section className="relative py-16 px-4 md:px-20 text-center overflow-hidden">
                    <div className="blob-bg absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary-container opacity-40 rounded-full"></div>
                    <div className="blob-bg absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-primary-fixed opacity-30 rounded-full"></div>
                    
                    <div className="max-w-[800px] mx-auto z-10 relative">
                        <span className="inline-block px-6 py-2 bg-secondary-fixed text-on-secondary-fixed rounded-full font-label-md mb-6 font-bold shadow-sm">
                            Conoce Nuestra Plataforma
                        </span>
                        <h1 className="font-display-lg text-4xl md:text-5xl font-bold text-primary mb-6 leading-tight">
                            ¿Cómo funciona Guardianes de Sonrisas?
                        </h1>
                        <p className="font-body-lg text-lg text-on-surface-variant max-w-[650px] mx-auto">
                            Conectamos de forma segura y empática a familias que necesitan asistencia con cuidadores profesionales y de confianza.
                        </p>
                    </div>
                </section>

                {/* Misión y Objetivo Section */}
                <section className="px-4 md:px-20 mb-20">
                    <div className="max-w-[1100px] mx-auto">
                        <GlassCard className="rounded-[40px] p-8 md:p-12 shadow-xl border border-outline-variant/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px]"></div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                                <div>
                                    <h2 className="font-display-lg text-2xl md:text-3xl font-bold text-primary mb-6">
                                        Nuestro Objetivo
                                    </h2>
                                    <p className="text-on-surface-variant leading-relaxed mb-6">
                                        El propósito de **Guardianes de Sonrisas** es simplificar la búsqueda de cuidados especializados en Bolivia. Entendemos que encontrar a alguien para cuidar a tus hijos, abuelos o seres queridos con necesidades especiales es una decisión de suma importancia y sensibilidad.
                                    </p>
                                    <p className="text-on-surface-variant leading-relaxed">
                                        Ofrecemos una plataforma transparente y segura que permite a las familias buscar perfiles detallados, y a los cuidadores profesionales ofrecer sus servicios especializados bajo tarifas justas y horarios flexibles, fomentando una comunidad de confianza y apoyo mutuo.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <h4 className="font-bold text-primary mb-2">Seguridad Primero</h4>
                                        <p className="text-xs text-on-surface-variant">Validamos la identidad y antecedentes de cada cuidador registrado.</p>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-secondary/5 border border-secondary/10 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-4">
                                            <Star size={24} />
                                        </div>
                                        <h4 className="font-bold text-secondary mb-2">Transparencia</h4>
                                        <p className="text-xs text-on-surface-variant">Familias reales dejan calificaciones y reseñas detalladas.</p>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-secondary/5 border border-secondary/10 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-4">
                                            <Heart size={24} />
                                        </div>
                                        <h4 className="font-bold text-secondary mb-2">Calidez Humana</h4>
                                        <p className="text-xs text-on-surface-variant">Cuidadores empáticos con verdadera vocación de servicio.</p>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                                            <Briefcase size={24} />
                                        </div>
                                        <h4 className="font-bold text-primary mb-2">Especialización</h4>
                                        <p className="text-xs text-on-surface-variant">Filtra cuidadores según habilidades y necesidades puntuales.</p>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </section>

                {/* Pasos para Familias */}
                <section className="px-4 md:px-20 mb-20">
                    <div className="max-w-[1100px] mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="font-display-lg text-3xl font-bold text-primary">Para las Familias</h2>
                            <p className="text-on-surface-variant mt-2">Encuentra asistencia ideal en pocos y sencillos pasos.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <GlassCard className="rounded-[32px] p-8 shadow-md border border-outline-variant/30 hover:shadow-lg transition-all flex flex-col items-start">
                                <span className="text-sm font-bold text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center mb-6">1</span>
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                                    <FileText size={24} />
                                </div>
                                <h3 className="font-display-lg text-xl font-bold mb-3">1. Registra tu perfil</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">
                                    Crea tu cuenta de "Padre/Madre" y rellena la información de tu familia: número de hijos/personas a cuidar, edades, ubicación y necesidades especiales.
                                </p>
                            </GlassCard>

                            <GlassCard className="rounded-[32px] p-8 shadow-md border border-outline-variant/30 hover:shadow-lg transition-all flex flex-col items-start">
                                <span className="text-sm font-bold text-secondary bg-secondary/10 w-8 h-8 rounded-full flex items-center justify-center mb-6">2</span>
                                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary mb-6">
                                    <Search size={24} />
                                </div>
                                <h3 className="font-display-lg text-xl font-bold mb-3">2. Busca y filtra</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">
                                    Explora la lista de cuidadores y filtra por categorías (Cuidado General, Cuidado Especial, Apoyo Escolar, etc.), ubicación y rango de precios.
                                </p>
                            </GlassCard>

                            <GlassCard className="rounded-[32px] p-8 shadow-md border border-outline-variant/30 hover:shadow-lg transition-all flex flex-col items-start">
                                <span className="text-sm font-bold text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center mb-6">3</span>
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                                    <UserCheck size={24} />
                                </div>
                                <h3 className="font-display-lg text-xl font-bold mb-3">3. Envía tu solicitud</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">
                                    Ingresa al perfil del cuidador ideal, selecciona la fecha, horas necesarias, el tipo de servicio y presiona "Enviar Solicitud" para iniciar la contratación.
                                </p>
                            </GlassCard>

                            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                                <GlassCard className="rounded-[32px] p-8 shadow-md border border-outline-variant/30 hover:shadow-lg transition-all flex flex-col items-start">
                                    <span className="text-sm font-bold text-secondary bg-secondary/10 w-8 h-8 rounded-full flex items-center justify-center mb-6">4</span>
                                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary mb-6">
                                        <CreditCard size={24} />
                                    </div>
                                    <h3 className="font-display-lg text-xl font-bold mb-3">4. Paga y confirma</h3>
                                    <p className="text-on-surface-variant text-sm leading-relaxed">
                                        Una vez aceptada la solicitud por el cuidador, realiza la transferencia bancaria o pago QR indicados. Sube la foto del comprobante para confirmar formalmente el servicio.
                                    </p>
                                </GlassCard>

                                <GlassCard className="rounded-[32px] p-8 shadow-md border border-outline-variant/30 hover:shadow-lg transition-all flex flex-col items-start">
                                    <span className="text-sm font-bold text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center mb-6">5</span>
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                                        <Star size={24} />
                                    </div>
                                    <h3 className="font-display-lg text-xl font-bold mb-3">5. Califica al cuidador</h3>
                                    <p className="text-on-surface-variant text-sm leading-relaxed">
                                        Una vez concluido el servicio, califica y deja una reseña en el perfil del cuidador. Esto ayuda a otros padres a tomar decisiones informadas y seguras.
                                    </p>
                                </GlassCard>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pasos para Cuidadores */}
                <section className="px-4 md:px-20 mb-20 py-16 bg-surface-container-low">
                    <div className="max-w-[1100px] mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="font-display-lg text-3xl font-bold text-primary">Para los Cuidadores</h2>
                            <p className="text-on-surface-variant mt-2">Ofrece tus servicios y haz crecer tu trayectoria laboral.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <GlassCard className="rounded-[24px] p-6 shadow-sm border border-outline-variant/20 hover:shadow-md transition-all flex flex-col items-start">
                                <span className="text-xs font-bold text-primary bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center mb-4">1</span>
                                <h4 className="font-bold text-base mb-2">1. Regístrate</h4>
                                <p className="text-xs text-on-surface-variant leading-relaxed">
                                    Crea tu perfil como "Cuidador", ingresa tu experiencia, tus tarifas por hora base, tu nivel de educación y adjunta tus documentos.
                                </p>
                            </GlassCard>

                            <GlassCard className="rounded-[24px] p-6 shadow-sm border border-outline-variant/20 hover:shadow-md transition-all flex flex-col items-start">
                                <span className="text-xs font-bold text-secondary bg-secondary/10 w-6 h-6 rounded-full flex items-center justify-center mb-4">2</span>
                                <h4 className="font-bold text-base mb-2">2. Crea tus Servicios</h4>
                                <p className="text-xs text-on-surface-variant leading-relaxed">
                                    Define los servicios especializados que ofreces. Estos se enviarán para revisión por el administrador antes de ser visibles en el catálogo general.
                                </p>
                            </GlassCard>

                            <GlassCard className="rounded-[24px] p-6 shadow-sm border border-outline-variant/20 hover:shadow-md transition-all flex flex-col items-start">
                                <span className="text-xs font-bold text-primary bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center mb-4">3</span>
                                <h4 className="font-bold text-base mb-2">3. Acepta Solicitudes</h4>
                                <p className="text-xs text-on-surface-variant leading-relaxed">
                                    Revisa las solicitudes entrantes en tu tablero. Puedes aceptar o rechazar las contrataciones basándote en tu disponibilidad y agenda.
                                </p>
                            </GlassCard>

                            <GlassCard className="rounded-[24px] p-6 shadow-sm border border-outline-variant/20 hover:shadow-md transition-all flex flex-col items-start">
                                <span className="text-xs font-bold text-secondary bg-secondary/10 w-6 h-6 rounded-full flex items-center justify-center mb-4">4</span>
                                <h4 className="font-bold text-base mb-2">4. Valida y Brinda Cuidado</h4>
                                <p className="text-xs text-on-surface-variant leading-relaxed">
                                    Verifica que la familia haya subido el comprobante de pago bancario en tu tablero, confirma el recibo de la transacción y asiste a brindar el mejor servicio.
                                </p>
                            </GlassCard>
                        </div>
                    </div>
                </section>

                {/* Call to Action */}
                <section className="px-4 md:px-20 text-center">
                    <div className="max-w-[700px] mx-auto">
                        <h3 className="font-display-lg text-2xl font-bold text-primary mb-4">¿Listo para formar parte de Guardianes de Sonrisas?</h3>
                        <p className="text-on-surface-variant mb-8 text-sm">Empieza hoy mismo y experimenta el cuidado de una forma totalmente segura y confiable.</p>
                        <div className="flex gap-4 justify-center">
                            <Link to="/register" className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-primary-container transition active:scale-95 text-sm">
                                Registrarse Ahora
                            </Link>
                            <Link to="/" className="bg-surface-container text-on-surface-variant px-6 py-3 rounded-full font-bold hover:bg-surface-container-highest transition text-sm">
                                Volver al Inicio
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="w-full py-10 bg-surface-container-low flex flex-col items-center justify-center gap-6 border-t border-outline-variant/30">
                <div className="flex flex-col items-center gap-4">
                    <span className="font-display-lg text-xl font-bold text-primary">Guardianes de Sonrisas</span>
                    <div className="flex gap-6 mt-2">
                        <Link className="text-on-surface-variant hover:text-secondary font-bold transition-colors text-sm" to="/privacy">Privacidad</Link>
                        <Link className="text-on-surface-variant hover:text-secondary font-bold transition-colors text-sm" to="/terms">Términos</Link>
                        <Link className="text-on-surface-variant hover:text-secondary font-bold transition-colors text-sm" to="/contact">Contacto</Link>
                    </div>
                </div>
                <div className="mt-8 text-on-surface-variant text-sm">
                    © 2026 Guardianes de Sonrisas. Cuidado con compasión.
                </div>
            </footer>
        </div>
    );
};

export default HowItWorks;
