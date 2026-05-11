import React from 'react';
import GlassCard from './GlassCard';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const CustomModal = ({ isOpen, onClose, title, message, type = 'success' }) => {
    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle className="text-green-500" size={48} />,
        error: <AlertTriangle className="text-error" size={48} />,
        info: <Info className="text-primary" size={48} />
    };

    const colors = {
        success: 'border-t-green-500',
        error: 'border-t-error',
        info: 'border-t-primary'
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <GlassCard className={`w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative border-t-8 ${colors[type]} animate-in zoom-in duration-300`}>
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition"
                >
                    <X size={20} />
                </button>
                
                <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                        {icons[type]}
                    </div>
                    <h2 className="font-display-lg text-2xl font-bold mb-2 text-dark">
                        {title}
                    </h2>
                    <p className="text-on-surface-variant mb-8 leading-relaxed">
                        {message}
                    </p>
                    <button 
                        onClick={onClose}
                        className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-container transition active:scale-95"
                    >
                        Aceptar
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

export default CustomModal;
