import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getVapidPublicKey, savePushSubscription, getDashboard } from '../services/api';


const DISMISS_KEY = 'breso_push_dismissed_until';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function getGreetingKey() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'dashboard.greeting_morning';
  if (hour >= 12 && hour < 20) return 'dashboard.greeting_afternoon';
  return 'dashboard.greeting_evening';
}

function getTimeColor() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'text-amber-600 dark:text-yellow-500' // morning
  if (hour >= 12 && hour < 20) return 'text-[#7C9A7E]' // afternoon
  return 'text-[#4A5E4A] dark:text-[#9CAF9C]' // night
}

function getTimeTint() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'bg-amber-50/50 dark:bg-amber-900/5'
  if (hour >= 12 && hour < 20) return 'bg-[#F0F7F0]/60 dark:bg-sage/5'
  return 'bg-[#1A2A1A]/5 dark:bg-[#0D1A0D]/20'
}

function getDayOfYear() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = (new Date() - start) + ((start.getTimezoneOffset() - new Date().getTimezoneOffset()) * 60 * 1000);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function Home() {
  const { t } = useTranslation();
  const microcopy = t('home.microcopy', { returnObjects: true });
  const getDailyMicrocopy = () => Array.isArray(microcopy) ? microcopy[getDayOfYear() % 7] : '';
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [streak, setStreak] = useState(0);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [pushState, setPushState] = useState('idle'); // idle | loading | success | error

  useEffect(() => {
    try {
      const name = localStorage.getItem('breso_user_name') || 'Usuario';
      setUserName(name);
    } catch {
      setUserName('Usuario');
    }

    let active = true;
    (async () => {
      try {
        const dash = await getDashboard();
        if (active && dash.data) {
          setStreak(Number(dash.data.streakDaysConsecutive) || 0);
        }
      } catch {}
    })();
    return () => { active = false };
  }, []);

  const renderStreakText = () => {
    if (streak === 0) return t('home.streakStart');
    if (streak === 1) return t('home.streakFirst');
    return t('home.streakDays', { days: streak });
  }

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

  const greeting = t(getGreetingKey());

  return (
    <div className={`animate-fade-in-page space-y-8 pb-32 min-h-screen transition-colors duration-700 ${getTimeTint()}`}>

      {/* Push Notification Banner */}
      {showPushBanner && (
        <div className="mx-2 mt-2 rounded-2xl overflow-hidden shadow-md" style={{ background: '#7C9A7E' }}>
          <div className="p-4">
            {pushState === 'success' ? (
              <p className="text-white font-semibold text-center text-sm">
                {t('home.pushSuccess')}
              </p>
            ) : (
              <>
                <div className="mb-3">
                  <p className="text-white font-bold text-sm">
                    {t('home.pushTitle')}
                  </p>
                  <p className="text-white/80 text-xs mt-0.5">
                    {t('home.pushSubtitle')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleEnablePush}
                    disabled={pushState === 'loading'}
                    className="flex-1 bg-white text-[#7C9A7E] font-bold py-2 rounded-xl text-sm hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-70"
                  >
                    {pushState === 'loading' ? t('home.pushEnabling') : pushState === 'error' ? t('home.pushRetry') : t('home.pushEnable')}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 bg-white/20 text-white font-semibold py-2 rounded-xl text-sm hover:bg-white/30 active:scale-[0.98] transition"
                  >
                    {t('home.pushDismiss')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top Section */}
      <div className="flex flex-col items-center pt-8 fade-in-page">
        <h1 className={`text-xl font-medium mb-6 ${getTimeColor()}`}>
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
          {t('home.greeting', { name: userName })}
        </h2>
        <button
          onClick={() => navigate('/chat')}
          className="w-full bg-[#7C9A7E] text-white rounded-xl py-3.5 px-4 font-semibold shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg active:scale-95 text-[15px]"
        >
          {t('home.talkButton')}
        </button>
        <p className="text-center text-xs font-medium text-textdark/50 dark:text-dm-muted mt-4">
          {getDailyMicrocopy()}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 px-2">
        <div className="bg-white dark:bg-[#3D4F3D] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm border border-softgray/50 dark:border-dm-border">
          <span className="text-xs text-textdark/50 dark:text-dm-muted font-medium uppercase tracking-wide mb-1">{t('home.streakLabel')}</span>
          <span className={`text-[13px] font-bold ${streak > 0 ? 'text-[#C4962A] dark:text-yellow-500' : 'text-textdark dark:text-dm-text'}`}>
            {renderStreakText()}
          </span>
        </div>
        <div className="bg-white dark:bg-[#3D4F3D] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm border border-softgray/50 dark:border-dm-border">
          <span className="text-xl mb-1">📅</span>
          <span className="text-xs text-textdark/50 dark:text-dm-muted font-medium uppercase tracking-wide mb-0.5">{t('home.lastLabel')}</span>
          <span className="text-sm font-bold text-textdark dark:text-dm-text">{t('home.lastValue')}</span>
        </div>
        <div className="bg-white dark:bg-[#3D4F3D] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm border border-softgray/50 dark:border-dm-border">
          <span className="text-xl mb-1">✅</span>
          <span className="text-xs text-textdark/50 dark:text-dm-muted font-medium uppercase tracking-wide mb-0.5">{t('home.planLabel')}</span>
          <span className="text-sm font-bold text-textdark dark:text-dm-text">{t('home.planValue')}</span>
        </div>
      </div>

      {/* Quick Links */}
      <div className="px-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#4A5E4A] dark:text-[#9CAF9C] mb-4 ml-1">
          {t('home.quickLinks')}
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => navigate('/dashboard')} className="flex-shrink-0 w-28 h-28 bg-white dark:bg-[#3D4F3D] rounded-2xl flex flex-col items-center justify-center shadow-sm border border-softgray/50 dark:border-dm-border snap-start transition-transform hover:-translate-y-1">
            <span className="text-2xl mb-2 text-[#7C9A7E]">📊</span>
            <span className="text-[13px] font-semibold text-textdark/80 dark:text-dm-text text-center leading-tight">{t('home.progress')}</span>
          </button>
          <button onClick={() => navigate('/contacts')} className="flex-shrink-0 w-28 h-28 bg-white dark:bg-[#3D4F3D] rounded-2xl flex flex-col items-center justify-center shadow-sm border border-softgray/50 dark:border-dm-border snap-start transition-transform hover:-translate-y-1">
            <span className="text-2xl mb-2 text-[#7C9A7E]">🤝</span>
            <span className="text-[13px] font-semibold text-textdark/80 dark:text-dm-text text-center leading-tight">{t('home.contacts')}</span>
          </button>
          <button onClick={() => navigate('/settings')} className="flex-shrink-0 w-28 h-28 bg-white dark:bg-[#3D4F3D] rounded-2xl flex flex-col items-center justify-center shadow-sm border border-softgray/50 dark:border-dm-border snap-start transition-transform hover:-translate-y-1">
            <span className="text-2xl mb-2 text-[#7C9A7E]">⚙️</span>
            <span className="text-[13px] font-semibold text-textdark/80 dark:text-dm-text text-center leading-tight">{t('nav.settings')}</span>
          </button>
          <button onClick={() => navigate('/help')} className="flex-shrink-0 w-28 h-28 bg-white dark:bg-[#3D4F3D] rounded-2xl flex flex-col items-center justify-center shadow-sm border border-softgray/50 dark:border-dm-border snap-start transition-transform hover:-translate-y-1">
            <span className="text-2xl mb-2 text-[#7C9A7E]">🆘</span>
            <span className="text-[13px] font-semibold text-textdark/80 dark:text-dm-text text-center leading-tight">{t('home.help')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
