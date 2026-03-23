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
        <div className="filter brightness-0 invert drop-shadow-md mb-3">
          <svg viewBox="0 0 240 70" xmlns="http://www.w3.org/2000/svg" width="240" style={{display:'block',margin:'0 auto'}}>
            <circle cx="28" cy="35" r="22" fill="#7C9A7E" opacity="0.9"/>
            <circle cx="48" cy="35" r="22" fill="#A8C5A0" opacity="0.7"/>
            <ellipse cx="38" cy="35" rx="8" ry="16" fill="#7C9A7E" opacity="0.5"/>
            <text x="82" y="41" font-family="system-ui,-apple-system,sans-serif" font-size="28" font-weight="700" fill="#2D2D2D" letter-spacing="3">BRESO</text>
          </svg>
        </div>
        <span className="text-xs font-medium opacity-80 uppercase tracking-widest mt-2">por Soledad</span>
      </div>
    </div>
  );
}
