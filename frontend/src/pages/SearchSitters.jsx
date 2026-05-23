import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import GlassCard from '../components/common/GlassCard';
import { Star, MapPin } from 'lucide-react';
import api from '../services/api';

const SearchSitters = () => {
    const [sitters, setSitters] = useState([]);

    useEffect(() => {
        const fetchSitters = async () => {
            try {
                const response = await api.get('/sitters');
                if (response.data && response.data.success) {
                    setSitters(response.data.data);
                }
            } catch (err) {
                console.error('Error fetching sitters:', err);
            }
        };
        fetchSitters();
    }, []);

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <Navbar />
            <div className="pt-28 pb-12 px-4 md:px-10 max-w-[1280px] mx-auto">
                <h1 className="font-display-lg text-4xl font-bold text-primary mb-2">Nuestros Cuidadores</h1>
                <p className="text-on-surface-variant mb-10 text-lg">Encuentra a la persona ideal para tu familia.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sitters.length > 0 ? sitters.map(sitter => (
                        <Link to={`/sitter/${sitter.id}`} key={sitter.id}>
                            <GlassCard className="rounded-[32px] p-6 hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-dim">
                                        <img src={sitter.avatar} alt={sitter.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h3 className="font-display-lg text-xl font-bold text-dark">{sitter.name}</h3>
                                        <p className="text-on-surface-variant text-sm flex items-center gap-1"><MapPin size={14}/>{sitter.city}</p>
                                        <div className="flex items-center text-secondary-container mt-1">
                                            <Star size={16} style={{fill: 'currentColor'}}/>
                                            <span className="text-dark font-bold ml-1 text-sm">{sitter.rating}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-on-surface-variant text-sm mb-4 line-clamp-2 flex-grow">{sitter.description}</p>
                                <div className="flex justify-between items-center mt-auto border-t border-outline-variant/30 pt-4">
                                    <div className="font-bold text-primary text-lg">Bs. {sitter.rate}/hr</div>
                                    <div className="text-sm text-on-surface-variant">{sitter.experience} años exp.</div>
                                </div>
                            </GlassCard>
                        </Link>
                    )) : (
                        <div className="col-span-full text-center py-20">
                            <p className="text-xl text-on-surface-variant font-bold">Aún no hay cuidadores registrados.</p>
                            <p className="text-md text-outline mt-2">¡Regístrate como cuidador para aparecer aquí!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchSitters;
