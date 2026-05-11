import React from 'react';

const Hero = () => {
    return (
        <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-dark mb-6 tracking-tight">
                Conectamos a tu familia con <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    cuidadores de confianza
                </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl">
                Niñeras y cuidadores verificados, disponibles cuando los necesitas. Seguridad y tranquilidad para ti.
            </p>
            <div className="flex gap-4">
                <button className="bg-primary text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-primary/90 transition shadow-xl hover:shadow-primary/30">
                    Soy Padre
                </button>
                <button className="bg-white text-primary border-2 border-primary/20 px-8 py-4 rounded-full text-lg font-semibold hover:border-primary transition shadow-lg">
                    Soy Cuidador
                </button>
            </div>
        </div>
    );
};

export default Hero;
