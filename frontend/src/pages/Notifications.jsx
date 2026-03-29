import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getAlerts, markAlertRead, markAllAlertsRead } from '../services/api'

function formatDate(value, language = 'es-AR') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(language, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Notifications() {
  const { t, i18n } = useTranslation()
  const [filter, setFilter] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await getAlerts()
        if (!mounted) return
        const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
        setNotifications(items.map((item, index) => ({
          id: item.id || `${item.type || 'alert'}-${index}`,
          type: item.type?.startsWith('system') ? 'system' : 'alerts',
          message: item.body || item.message || item.title || t('notifications.empty'),
          date: formatDate(item.created_at || item.triggered_at, i18n.language || 'es-AR'),
          read: Boolean(item.read),
          icon: item.icon || (item.type?.startsWith('system') ? '📊' : '🔔'),
          rawType: item.type,
        })))
      } catch (err) {
        if (mounted) setError(err?.message || t('notifications.empty'))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [i18n.language, t])

  const filtered = useMemo(
    () => notifications.filter((notification) => filter === 'all' || notification.type === filter),
    [filter, notifications]
  )
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  )

  const handleMarkAllRead = async () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })))
    try {
      await markAllAlertsRead()
    } catch (err) {
      console.warn('[Notifications] markAllAlertsRead failed', err?.message || err)
    }
  }

  const handleMarkOneRead = async (notification) => {
    if (notification.read) return
    setNotifications((current) => current.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
    try {
      await markAlertRead(notification.id)
    } catch (err) {
      console.warn('[Notifications] markAlertRead failed', err?.message || err)
    }
  }

  return (
    <div className="animate-fade-in-page space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
          {t('notifications.title')}
        </h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-sm font-medium text-sage hover:underline"
          >
            {t('notifications.mark_read')}
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1 rounded-xl bg-softgray dark:bg-dm-border">
        {['all', 'alerts', 'system'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-white dark:bg-dm-surface text-textdark dark:text-dm-text shadow-sm'
                : 'text-textdark/60 dark:text-dm-muted hover:text-textdark dark:hover:text-dm-text'
            }`}
          >
            {t(`notifications.filter_${f}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage border-r-transparent" />
          <p className="mt-4 text-sm text-textdark/60 dark:text-dm-muted">{t('common.loading')}</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-20 w-20 mb-5 rounded-full bg-sage/10 dark:bg-sage/20 flex flex-col items-center justify-center text-sage">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.866 8.21 8.21 0 003 2.48z" />
                </svg>
              </div>
              <p className="text-textdark/70 dark:text-dm-text/80 font-medium text-lg">
                {t('notifications.empty')}
              </p>
            </div>
          ) : (
            filtered.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleMarkOneRead(notification)}
                className={`w-full text-left flex gap-4 p-4 rounded-2xl border transition-colors ${
                  notification.read
                    ? 'bg-white dark:bg-dm-surface border-transparent shadow-soft'
                    : 'bg-sage/5 dark:bg-sage/10 border-sage/20'
                }`}
              >
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-softgray dark:bg-dm-border text-lg">
                  {notification.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notification.read ? 'text-textdark/80 dark:text-dm-text/80' : 'text-textdark dark:text-dm-text font-medium'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-textdark/50 dark:text-dm-muted mt-1">
                    {notification.date}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-sage mt-1.5 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
