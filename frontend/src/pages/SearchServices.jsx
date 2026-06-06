import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import GlassCard from '../components/common/GlassCard';
import { Star, MapPin, Search, DollarSign, Filter, RefreshCw, Briefcase } from 'lucide-react';
import api from '../services/api';

const SearchServices = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    
    // Filters and Sorting States
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [city, setCity] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sort, setSort] = useState('recent');

    // Available categories
    const categories = [
        "Cuidado General / Juegos",
        "Cuidado Especial / Estimulación",
        "Apoyo Escolar / Tareas",
        "Cuidado Nocturno / Fin de Semana",
        "Otros Servicios"
    ];

    const fetchServices = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (search) queryParams.append('search', search);
            if (category) queryParams.append('category', category);
            if (city) queryParams.append('city', city);
            if (minPrice) queryParams.append('min_price', minPrice);
            if (maxPrice) queryParams.append('max_price', maxPrice);
            if (sort) queryParams.append('sort', sort);

            const response = await api.get(`/services?${queryParams.toString()}`);
            if (response.data && response.data.success) {
                setServices(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching services:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchServices();
        }, 300); // Debounce search input changes

        return () => clearTimeout(delayDebounceFn);
    }, [search, category, city, minPrice, maxPrice, sort]);

    const handleClearFilters = () => {
        setSearch('');
        setCategory('');
        setCity('');
        setMinPrice('');
        setMaxPrice('');
        setSort('recent');
    };

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <Navbar />
            <div className="pt-28 pb-12 px-4 md:px-10 max-w-[1280px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="font-display-lg text-4xl font-bold text-primary mb-2">Búsqueda de Servicios</h1>
                        <p className="text-on-surface-variant text-lg">Encuentra y contrata cuidadores según tu necesidad específica.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className="lg:hidden flex items-center gap-2 text-primary hover:text-primary-container font-bold text-sm bg-primary/10 px-4 py-2.5 rounded-full transition-all duration-300 active:scale-95"
                        >
                            <Filter size={16} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                        </button>
                        <button 
                            onClick={handleClearFilters}
                            className="flex items-center gap-2 text-primary hover:text-primary-container font-bold text-sm bg-primary/10 px-4 py-2.5 rounded-full transition-all duration-300 active:scale-95"
                        >
                            <RefreshCw size={16} /> Limpiar Filtros
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Filters Sidebar */}
                    <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                        <GlassCard className="rounded-[32px] p-6 lg:sticky lg:top-28 shadow-xl border border-outline-variant/30">
                            <h3 className="font-display-lg text-xl font-bold text-dark mb-6 flex items-center gap-2">
                                <Filter size={18} className="text-primary"/> Filtros Avanzados
                            </h3>
                            
                            <div className="space-y-6">
                                {/* Search Input */}
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Buscar</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Título, cuidador..." 
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        <Search size={16} className="absolute left-3.5 top-3.5 text-outline" />
                                    </div>
                                </div>

                                {/* Category Select */}
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Categoría</label>
                                    <select 
                                        className="w-full p-3 rounded-xl border border-outline-variant/50 bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary text-sm transition"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        <option value="">Todas las categorías</option>
                                        {categories.map((cat, idx) => (
                                            <option key={idx} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* City Input */}
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Ciudad</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Ej: Madrid, Barcelona..." 
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                        />
                                        <MapPin size={16} className="absolute left-3.5 top-3.5 text-outline" />
                                    </div>
                                </div>

                                {/* Price inputs */}
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Rango de Precios (Bs./hr)</label>
                                    <div className="flex gap-2 items-center">
                                        <div className="relative flex-1">
                                            <input 
                                                type="number" 
                                                placeholder="Mín" 
                                                className="w-full pl-8 pr-2 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition"
                                                value={minPrice}
                                                onChange={(e) => setMinPrice(e.target.value)}
                                            />
                                            <span className="absolute left-2.5 top-3 text-outline text-sm">Bs.</span>
                                        </div>
                                        <span className="text-outline text-xs font-bold">-</span>
                                        <div className="relative flex-1">
                                            <input 
                                                type="number" 
                                                placeholder="Máx" 
                                                className="w-full pl-8 pr-2 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition"
                                                value={maxPrice}
                                                onChange={(e) => setMaxPrice(e.target.value)}
                                            />
                                            <span className="absolute left-2.5 top-3 text-outline text-sm">Bs.</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sorting dropdown */}
                                <div>
                                    <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Ordenar Por</label>
                                    <select 
                                        className="w-full p-3 rounded-xl border border-outline-variant/50 bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary text-sm transition"
                                        value={sort}
                                        onChange={(e) => setSort(e.target.value)}
                                    >
                                        <option value="recent">Los más recientes</option>
                                        <option value="rating">Los mejor calificados</option>
                                        <option value="bookings">Los más utilizados / contratados</option>
                                        <option value="price_asc">Precio: menor a mayor</option>
                                        <option value="price_desc">Precio: mayor a menor</option>
                                    </select>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Service Grid */}
                    <div className="lg:col-span-3">
                        {loading ? (
                            <div className="flex justify-center items-center py-40">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                            </div>
                        ) : services.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {services.map(service => (
                                    <GlassCard key={service.id} className="rounded-[32px] p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between border border-outline-variant/20 h-full">
                                        <div>
                                            {/* Sitter Avatar & Info */}
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-dim shrink-0 border border-outline-variant/40">
                                                    {service.sitter_avatar ? (
                                                        <img src={service.sitter_avatar} alt={service.sitter_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm">
                                                            {service.sitter_name?.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-dark text-md leading-tight">{service.sitter_name}</h3>
                                                    <div className="flex items-center text-amber-500 gap-1.5 mt-0.5">
                                                        <Star size={13} style={{ fill: 'currentColor' }} />
                                                        <span className="text-dark font-bold text-xs">{(service.sitter_rating || 0).toFixed(1)}</span>
                                                        <span className="text-outline text-[11px] font-medium">({service.sitter_experience || 0} años exp.)</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Service Info */}
                                            <h2 className="font-display-lg text-lg font-bold text-primary mb-2 line-clamp-1">{service.title}</h2>
                                            <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary rounded-full text-[11px] font-bold mb-3">
                                                {service.category}
                                            </span>
                                            <p className="text-on-surface-variant text-sm mb-6 line-clamp-3 leading-relaxed">
                                                {service.description}
                                            </p>
                                        </div>

                                        {/* Footer */}
                                        <div className="border-t border-outline-variant/20 pt-4 flex flex-col gap-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="text-outline-variant flex items-center gap-1">
                                                    <MapPin size={14} className="text-outline" />
                                                    <span className="text-xs text-on-surface-variant font-medium">{service.sitter_city || 'No especificada'}</span>
                                                </div>
                                                <div className="font-bold text-primary text-md">
                                                    Bs. {service.hourly_rate} / hr
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center gap-4 mt-1">
                                                <span className="text-[11px] bg-primary/5 text-primary-container px-2.5 py-1 rounded-md font-bold">
                                                    {service.booking_count || 0} contrataciones
                                                </span>
                                                <Link 
                                                    to={`/sitter/${service.sitter_id}`}
                                                    className="bg-primary hover:bg-primary-container text-on-primary text-xs font-bold px-4 py-2 rounded-full shadow-md transition-transform hover:scale-105 active:scale-95"
                                                >
                                                    Ver Cuidador
                                                </Link>
                                            </div>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        ) : (
                            <div className="col-span-full text-center py-24 bg-white/40 dark:bg-surface-container/40 rounded-[32px] p-8 border border-dashed border-outline-variant">
                                <Briefcase className="mx-auto text-outline/30 mb-4" size={48} />
                                <p className="text-xl text-on-surface-variant font-bold">No se encontraron servicios</p>
                                <p className="text-md text-outline mt-2 max-w-sm mx-auto">Prueba ajustando los filtros de búsqueda o restableciendo los parámetros.</p>
                                <button 
                                    onClick={handleClearFilters}
                                    className="mt-6 bg-primary text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-md hover:bg-primary-container transition"
                                >
                                    Restablecer Búsqueda
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchServices;
