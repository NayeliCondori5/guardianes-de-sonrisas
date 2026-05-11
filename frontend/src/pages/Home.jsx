import React from 'react';
import Navbar from '../components/common/Navbar';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="bg-background text-on-surface font-body-md overflow-x-hidden min-h-screen">
            <Navbar />
            <main className="pt-[80px]">
                {/* Hero Section */}
                <section className="relative min-h-[870px] flex items-center px-4 md:px-20 overflow-hidden">
                    <div className="blob-bg absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-secondary-container opacity-40 rounded-full"></div>
                    <div className="blob-bg absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-primary-fixed opacity-30 rounded-full"></div>
                    <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="z-10">
                            <span className="inline-block px-6 py-2 bg-secondary-fixed text-on-secondary-fixed rounded-full font-label-md mb-6 font-bold">Confianza & Calidez</span>
                            <h1 className="font-display-lg text-[48px] font-bold text-primary mb-6 leading-tight">Encuentra el cuidado perfecto para los que más amas.</h1>
                            <p className="font-body-lg text-lg text-on-surface-variant mb-12 max-w-[540px]">Conectamos a familias con cuidadores certificados y compasivos para niños, adultos mayores y personas con necesidades especiales.</p>
                            
                            {/* Search Bar */}
                            <div className="glass-card p-2 rounded-[32px] shadow-xl flex flex-col md:flex-row gap-2">
                                <div className="flex-1 flex items-center px-6 border-r border-outline-variant/30">
                                    <div className="flex flex-col w-full py-2">
                                        <label className="font-label-sm text-xs font-bold text-outline uppercase tracking-wider mb-1">¿Qué servicio buscas?</label>
                                        <input className="bg-transparent border-none p-0 focus:ring-0 text-on-surface placeholder:text-outline-variant font-body-md outline-none" placeholder="Ej: Cuidado infantil" type="text" />
                                    </div>
                                </div>
                                <div className="flex-1 flex items-center px-6 border-r border-outline-variant/30">
                                    <div className="flex flex-col w-full py-2">
                                        <label className="font-label-sm text-xs font-bold text-outline uppercase tracking-wider mb-1">Ubicación</label>
                                        <input className="bg-transparent border-none p-0 focus:ring-0 text-on-surface placeholder:text-outline-variant font-body-md outline-none" placeholder="Ciudad o Zona" type="text" />
                                    </div>
                                </div>
                                <button className="bg-primary text-on-primary px-8 py-4 m-2 rounded-[24px] font-bold hover:bg-primary-container transition-colors shadow-md">
                                    Buscar Ahora
                                </button>
                            </div>
                        </div>
                        <div className="relative hidden lg:block">
                            <div className="glass-card rounded-[40px] p-4 rotate-3 shadow-2xl relative z-10 overflow-hidden">
                                <img alt="Cuidadora profesional" className="rounded-[32px] w-full h-[500px] object-cover" src="/child1.png" />
                                <div className="absolute bottom-10 left-[-20px] glass-card px-6 py-4 rounded-xl flex items-center gap-4 shadow-lg -rotate-3">
                                    <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-xl text-primary">✓</div>
                                    <div>
                                        <p className="font-label-md text-primary font-bold">100% Verificados</p>
                                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Seguridad garantizada</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bento Grid Services */}
                <section className="py-20 px-4 md:px-20 bg-surface-container-low">
                    <div className="max-w-[1280px] mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="font-display-lg text-3xl font-bold text-primary mb-4">Servicios Especializados</h2>
                            <p className="font-body-md text-on-surface-variant">Soluciones de cuidado adaptadas a cada etapa de la vida.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-6 grid-rows-2 gap-6 h-auto md:h-[600px]">
                            <div className="md:col-span-3 md:row-span-2 glass-card rounded-[32px] overflow-hidden group relative min-h-[300px]">
                                <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="/child2.png" alt="Cuidado Infantil" />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-10 w-full">
                                    <span className="px-4 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold mb-4 inline-block">MÁS POPULAR</span>
                                    <h3 className="font-display-lg text-3xl font-bold text-white mb-2">Cuidado Infantil</h3>
                                    <p className="text-white/80 font-body-md mb-6">Nanas y cuidadores certificados para el desarrollo integral de tus hijos.</p>
                                    <button className="flex items-center gap-2 text-white font-bold hover:gap-4 transition-all">Explorar cuidadores →</button>
                                </div>
                            </div>
                            <div className="md:col-span-3 glass-card rounded-[32px] overflow-hidden group relative min-h-[250px]">
                                <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="/child3.png" alt="Adulto mayor" />
                                <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-transparent to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-8">
                                    <h3 className="font-display-lg text-2xl font-bold text-white mb-2">Cuidado de Adulto Mayor</h3>
                                    <p className="text-white/80 font-body-md">Acompañamiento profesional y asistencia médica.</p>
                                </div>
                            </div>
                            <div className="md:col-span-3 glass-card rounded-[32px] overflow-hidden group relative min-h-[250px]">
                                <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="/child1.png" alt="Necesidades Especiales" />
                                <div className="absolute inset-0 bg-gradient-to-t from-tertiary-container/80 via-transparent to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-8">
                                    <h3 className="font-display-lg text-2xl font-bold text-white mb-2">Necesidades Especiales</h3>
                                    <p className="text-white/80 font-body-md">Personal capacitado para brindar apoyo terapéutico.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTAs Section */}
                <section className="py-20 px-4 md:px-20 bg-primary relative overflow-hidden">
                    <div className="blob-bg absolute top-0 left-0 w-full h-full bg-secondary-container opacity-10"></div>
                    <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-12 rounded-[40px] flex flex-col items-start">
                            <h3 className="font-display-lg text-3xl font-bold text-white mb-6">¿Buscas cuidado de calidad?</h3>
                            <p className="text-white/80 mb-10 font-body-lg text-lg">Únete a miles de familias que confían en Guardianes de Sonrisas.</p>
                            <Link to="/register" className="bg-white text-primary px-8 py-4 rounded-full font-bold hover:bg-secondary-fixed-dim transition-all">
                                Empezar Búsqueda
                            </Link>
                        </div>
                        <div className="bg-primary-container border border-white/10 p-12 rounded-[40px] flex flex-col items-start">
                            <h3 className="font-display-lg text-3xl font-bold text-white mb-6">¿Eres cuidador profesional?</h3>
                            <p className="text-white/80 mb-10 font-body-lg text-lg">Encuentra oportunidades valiosas y crece profesionalmente.</p>
                            <Link to="/register" className="bg-secondary text-white px-8 py-4 rounded-full font-bold hover:bg-secondary-container hover:text-on-secondary-container transition-all">
                                Crear mi Perfil
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="w-full py-10 bg-surface-container-low flex flex-col items-center justify-center gap-6 border-t border-outline-variant/30">
                <div className="flex flex-col items-center gap-4">
                    <span className="font-display-lg text-xl font-bold text-primary">Guardianes de Sonrisas</span>
                    <div className="flex gap-6 mt-2">
                        <a className="text-on-surface-variant hover:text-secondary font-bold transition-colors" href="#">Privacidad</a>
                        <a className="text-on-surface-variant hover:text-secondary font-bold transition-colors" href="#">Términos</a>
                        <a className="text-on-surface-variant hover:text-secondary font-bold transition-colors" href="#">Contacto</a>
                    </div>
                </div>
                <div className="mt-8 text-on-surface-variant text-sm">
                    © 2026 Guardianes de Sonrisas. Cuidado con compasión.
                </div>
            </footer>
        </div>
    );
};

export default Home;
