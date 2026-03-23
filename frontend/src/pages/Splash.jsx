import { useEffect, useState } from 'react';

export default function Splash({ onComplete }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // start fade out
    const timer1 = setTimeout(() => {
      setFading(true);
    }, 1500);

    // complete and unmount
    const timer2 = setTimeout(() => {
      onComplete();
    }, 2300); // 1500 + 800ms fade out

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
        <img 
          src="/logo.svg" 
          alt="BRESO" 
          className="w-48 mb-3 filter brightness-0 invert drop-shadow-md" 
        />
        <span className="text-xs font-medium opacity-80 uppercase tracking-widest mt-2">por Soledad</span>
      </div>
    </div>
  );
}
