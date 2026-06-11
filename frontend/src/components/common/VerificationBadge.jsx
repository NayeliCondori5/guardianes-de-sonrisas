import React from 'react';
import { Check, AlertTriangle, ShieldCheck, Mail, Smartphone, Lock } from 'lucide-react';

const VerificationBadge = ({ type, verified, showText = true, className = '' }) => {
    const isVerified = verified === 1 || verified === true;

    const config = {
        identity: {
            label: 'Identidad',
            icon: ShieldCheck,
            colorVerified: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25',
            colorUnverified: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        },
        email: {
            label: 'Correo',
            icon: Mail,
            colorVerified: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25',
            colorUnverified: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        },
        phone: {
            label: 'Teléfono',
            icon: Smartphone,
            colorVerified: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25',
            colorUnverified: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        },
        '2fa': {
            label: 'Seguridad 2FA',
            icon: Lock,
            colorVerified: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25',
            colorUnverified: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        }
    };

    const current = config[type] || config.identity;
    const IconComponent = current.icon;

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-sm transition-all duration-300 ${isVerified ? current.colorVerified : current.colorUnverified} ${className}`}>
            <IconComponent size={14} />
            {showText && (
                <span>
                    {current.label}: {isVerified ? 'Verificado' : 'No verificado'}
                </span>
            )}
            {isVerified ? (
                <Check size={12} className="ml-0.5 shrink-0 text-emerald-600" />
            ) : (
                <AlertTriangle size={12} className="ml-0.5 shrink-0 text-slate-400" />
            )}
        </div>
    );
};

export default VerificationBadge;
