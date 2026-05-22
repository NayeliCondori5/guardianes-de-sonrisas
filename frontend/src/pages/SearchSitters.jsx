import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import GlassCard from '../components/common/GlassCard';
import { Star, MapPin } from 'lucide-react';

const mockSitters = [
    { id: 1, name: 'Ana García', city: 'Madrid', age: 25, rate: 15, experience: 3, verified: true, avatar: '/child1.png', rating: 4.8, description: 'Estudiante de educación infantil, amante de los animales.' },
    { id: 2, name: 'Sofía Martínez', city: 'Barcelona', age: 28, rate: 18, experience: 5, verified: true, avatar: '/child2.png', rating: 5.0, description: 'Especialista en necesidades especiales y terapia lúdica.' },
    { id: 3, name: 'Elena Rodríguez', city: 'Valencia', age: 32, rate: 20, experience: 8, verified: true, avatar: '/child3.png', rating: 4.9, description: 'Enfermera pediátrica con amplia experiencia.' }
];

const SearchSitters = () => {
    const [sitters, setSitters] = useState([]);

    useEffect(() => {
        // Fetch only registered sitters from our localStorage users array who have a completed profile
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]');

        const registeredSitters = allUsers
            .filter(u => u.role === 'sitter' && u.description && u.rate)
            .map(u => {
                const sitterReviews = allReviews.filter(r => r.sitterId?.toString() === u.id?.toString());
                const avgRating = sitterReviews.length > 0
                    ? (sitterReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / sitterReviews.length).toFixed(1)
                    : (u.rating || 5.0).toFixed(1);

                return {
                    id: u.id,
                    name: u.full_name,
                    city: u.city || 'Ciudad no especificada',
                    age: u.age || 25,
                    rate: u.rate || 15,
                    experience: u.experience || 1,
                    verified: u.verified || false,
                    avatar: u.avatar || '/child1.png',
                    rating: parseFloat(avgRating),
                    description: u.description || 'Cuidador apasionado y responsable.',
                    superpowers: u.superpowers || ['Manualidades', 'Juegos creativos'],
                    comfortableWith: u.comfortableWith || ['Mascotas', 'Ayuda con tarea'],
                    availability: u.availability || {
                        LUN: { manana: true, mediodia: false, tarde: true, noche: false },
                        MAR: { manana: true, mediodia: true, tarde: true, noche: false },
                        MIE: { manana: false, mediodia: false, tarde: true, noche: true },
                        JUE: { manana: true, mediodia: true, tarde: false, noche: false },
                        VIE: { manana: true, mediodia: true, tarde: true, noche: true },
                        SAB: { manana: false, mediodia: false, tarde: false, noche: true },
                        DOM: { manana: false, mediodia: false, tarde: false, noche: false },
                    }
                };
            });
        
        // If there are no registered sitters, we can optionally still show mock ones 
        // but the user requested ONLY registered ones. We will show an empty state or the registered ones.
        setSitters(registeredSitters);
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
