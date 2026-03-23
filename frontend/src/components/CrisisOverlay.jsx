import React from 'react'

export default function CrisisOverlay({ isVisible, onClose }) {
    if (!isVisible) return null

    const numbers = [
        { country: '🇦🇷 Argentina', number: '135', link: '135' },
        { country: '🇲🇽 México', number: '800-290-0024', link: '8002900024' },
        { country: '🇨🇴 Colombia', number: '106', link: '106' },
        { country: '🇨🇱 Chile', number: '600-360-7577', link: '6003607577' },
        { country: '🇪🇸 España', number: '024', link: '024' },
        { country: '🇺🇸 USA', number: '988', link: '988' },
    ]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-[480px] rounded-[16px] bg-white p-6 shadow-xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="text-5xl mb-4">🌱</div>

                <h2 className="text-2xl font-bold text-textdark text-center mb-2">Estamos acá con vos</h2>
                <p className="text-textdark/80 text-center mb-6 text-base">
                    Notamos que estás pasando un momento muy difícil. No estás solo/a.
                </p>

                <div className="w-full bg-softgray/20 rounded-xl p-4 mb-6">
                    <p className="text-sm font-semibold text-textdark/60 text-center mb-3 uppercase tracking-wider">
                        Líneas de apoyo
                    </p>
                    <div className="flex flex-col gap-3">
                        {numbers.map((item) => (
                            <a
                                key={item.country}
                                href={`tel:${item.link}`}
                                className="flex items-center justify-between bg-white border border-softgray rounded-xl p-3 hover:border-sage hover:bg-sage/5 transition shadow-sm active:scale-[0.98]"
                            >
                                <span className="font-semibold text-textdark">{item.country}</span>
                                <span className="text-sage font-bold text-lg underline decoration-sage/30 underline-offset-2">
                                    {item.number}
                                </span>
                            </a>
                        ))}
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-sage text-white font-bold text-lg py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition shadow-md"
                >
                    Seguir hablando con Soledad
                </button>
            </div>
        </div>
    )
}
