import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getVapidPublicKey, savePushSubscription } from '../services/api';

const DISMISS_KEY = 'breso_push_dismissed_until';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

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
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [pushState, setPushState] = useState('idle'); // idle | loading | success | error

  useEffect(() => {
    try {
      const name = localStorage.getItem('breso_user_name') || 'Usuario';
      setUserName(name);
    } catch {
      setUserName('Usuario');
    }
  }, []);

  // Check if push banner should show
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'granted') return;

    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;
    } catch { /* ignore */ }

    setShowPushBanner(true);
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch { /* ignore */ }
    setShowPushBanner(false);
  };

  const handleEnablePush = async () => {
    setPushState('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState('idle');
        setShowPushBanner(false);
        return;
      }

      const keyRes = await getVapidPublicKey();
      const vapidKey = keyRes?.vapid_public_key || keyRes?.data?.vapid_public_key;

      const reg = await navigator.serviceWorker.ready;
      const subscribeOptions = { userVisibleOnly: true };
      if (vapidKey) subscribeOptions.applicationServerKey = urlBase64ToUint8Array(vapidKey);

      const subscription = await reg.pushManager.subscribe(subscribeOptions);
      await savePushSubscription(subscription.toJSON());

      setPushState('success');
      setTimeout(() => setShowPushBanner(false), 2000);
    } catch (err) {
      console.warn('[Push] failed:', err?.message);
      setPushState('error');
      setTimeout(() => setPushState('idle'), 2000);
    }
  };

  const greeting = getGreeting();

  return (
    <div className="animate-fade-in-page space-y-8 pb-32">

      {/* Push Notification Banner */}
      {showPushBanner && (
        <div className="mx-2 mt-2 rounded-2xl overflow-hidden shadow-md" style={{ background: '#7C9A7E' }}>
          <div className="p-4">
            {pushState === 'success' ? (
              <p className="text-white font-semibold text-center text-sm">
                ✅ Notificaciones activadas
              </p>
            ) : (
              <>
                <div className="mb-3">
                  <p className="text-white font-bold text-sm">
                    🔔 Activá las notificaciones (recomendado)
                  </p>
                  <p className="text-white/80 text-xs mt-0.5">
                    Para que Soledad pueda avisarte cuando sea importante
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleEnablePush}
                    disabled={pushState === 'loading'}
                    className="flex-1 bg-white text-[#7C9A7E] font-bold py-2 rounded-xl text-sm hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-70"
                  >
                    {pushState === 'loading' ? 'Activando...' : pushState === 'error' ? 'Reintentar' : 'Activar'}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 bg-white/20 text-white font-semibold py-2 rounded-xl text-sm hover:bg-white/30 active:scale-[0.98] transition"
                  >
                    Ahora no
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
