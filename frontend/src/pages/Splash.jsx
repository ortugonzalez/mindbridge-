import { useEffect, useState } from 'react';

export default function Splash({ onComplete }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // start fade out
    const timer1 = setTimeout(() => {
      setFading(true);
    }, 2000);

    // complete and unmount
    const timer2 = setTimeout(() => {
      onComplete();
    }, 2800); // 2000 + 800ms fade out

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-1000 bg-gradient-to-b from-[#7C9A7E] to-[#5A7A5C] ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center text-white">
        <h1 className="text-8xl font-serif tracking-widest mb-2" style={{ fontFamily: 'Georgia, serif' }}>S</h1>
        <h2 className="text-3xl font-light tracking-[0.2em] uppercase mb-4">Soledad</h2>
        <span className="text-sm font-medium opacity-60 uppercase tracking-widest">por Breso</span>
      </div>
    </div>
  );
}
