import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
}

export default function Home() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        try {
            const name = localStorage.getItem('breso_user_name') || 'Usuario';
            setUserName(name);
        } catch {
            setUserName('Usuario');
        }
    }, []);

    const greeting = getGreeting();

    return (
        <div className="animate-fade-in-page space-y-8 pb-32">

            {/* Top Section */}
            <div className="flex flex-col items-center pt-8 fade-in-page">
                <h1 className="text-xl font-medium text-textdark/80 dark:text-dm-text/90 mb-6">
                    {greeting}, {userName}
                </h1>

                {/* Glowing Soledad Avatar */}
                <div className="relative mb-2">
                    <div className="absolute inset-0 rounded-full bg-[#7C9A7E] blur-xl opacity-40 animate-pulse"></div>
                    <div className="relative h-24 w-24 rounded-full bg-[#7C9A7E] flex items-center justify-center shadow-[0_0_20px_rgba(124,154,126,0.3)]">
                        <span className="text-4xl text-white font-bold tracking-widest">S</span>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white dark:bg-[#3D4F3D] rounded-[24px] p-6 shadow-sm border border-softgray/50 dark:border-dm-border mx-2">
                <h2 className="text-xl font-bold text-center text-textdark dark:text-dm-text mb-6">
                    ¿Cómo estás hoy, {userName}?
                </h2>
                <button
                    onClick={() => navigate('/chat')}
                    className="w-full bg-[#7C9A7E] text-white rounded-xl py-3.5 px-4 font-semibold shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg active:scale-95 text-[15px]"
                >
                    Hablar con Soledad
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 px-2">
                <div className="bg-white dark:bg-[#3D4F3D] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm border border-softgray/50 dark:border-dm-border">
                    <span className="text-xl mb-1">🔥</span>
                    <span className="text-xs text-textdark/50 dark:text-dm-muted font-medium uppercase tracking-wide mb-0.5">Racha</span>
                    <span className="text-sm font-bold text-textdark dark:text-dm-text">4 días</span>
                </div>
                <div className="bg-white dark:bg-[#3D4F3D] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm border border-softgray/50 dark:border-dm-border">
                    <span className="text-xl mb-1">📅</span>
                    <span className="text-xs text-textdark/50 dark:text-dm-muted font-medium uppercase tracking-wide mb-0.5">Último</span>
                    <span className="text-sm font-bold text-textdark dark:text-dm-text">Ayer</span>
                </div>
                <div className="bg-white dark:bg-[#3D4F3D] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm border border-softgray/50 dark:border-dm-border">
                    <span className="text-xl mb-1">✅</span>
                    <span className="text-xs text-textdark/50 dark:text-dm-muted font-medium uppercase tracking-wide mb-0.5">Plan</span>
                    <span className="text-sm font-bold text-textdark dark:text-dm-text">Esencial</span>
                </div>
            </div>

            {/* Quick Links */}
            <div className="px-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#4A5E4A] dark:text-[#9CAF9C] mb-4 ml-1">
                    Accesos rápidos
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar" style={{ scrollbarWidth: 'none' }}>

                    <button onClick={() => navigate('/dashboard')} className="flex-shrink-0 w-28 h-28 bg-white dark:bg-[#3D4F3D] rounded-2xl flex flex-col items-center justify-center shadow-sm border border-softgray/50 dark:border-dm-border snap-start transition-transform hover:-translate-y-1">
                        <span className="text-2xl mb-2 text-[#7C9A7E]">📊</span>
                        <span className="text-[13px] font-semibold text-textdark/80 dark:text-dm-text text-center leading-tight">Mi progreso</span>
                    </button>

                    <button onClick={() => navigate('/contacts')} className="flex-shrink-0 w-28 h-28 bg-white dark:bg-[#3D4F3D] rounded-2xl flex flex-col items-center justify-center shadow-sm border border-softgray/50 dark:border-dm-border snap-start transition-transform hover:-translate-y-1">
                        <span className="text-2xl mb-2 text-[#7C9A7E]">🤝</span>
                        <span className="text-[13px] font-semibold text-textdark/80 dark:text-dm-text text-center leading-tight">Contactos</span>
                    </button>

                    <button onClick={() => navigate('/settings')} className="flex-shrink-0 w-28 h-28 bg-white dark:bg-[#3D4F3D] rounded-2xl flex flex-col items-center justify-center shadow-sm border border-softgray/50 dark:border-dm-border snap-start transition-transform hover:-translate-y-1">
                        <span className="text-2xl mb-2 text-[#7C9A7E]">⚙️</span>
                        <span className="text-[13px] font-semibold text-textdark/80 dark:text-dm-text text-center leading-tight">Configuración</span>
                    </button>

                    <button onClick={() => navigate('/help')} className="flex-shrink-0 w-28 h-28 bg-white dark:bg-[#3D4F3D] rounded-2xl flex flex-col items-center justify-center shadow-sm border border-softgray/50 dark:border-dm-border snap-start transition-transform hover:-translate-y-1">
                        <span className="text-2xl mb-2 text-[#7C9A7E]">🆘</span>
                        <span className="text-[13px] font-semibold text-textdark/80 dark:text-dm-text text-center leading-tight">Ayuda</span>
                    </button>

                </div>
            </div>
        </div>
    );
}
