import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getAlerts, markAlertRead, markAllAlertsRead } from '../services/api'

export default function Notifications() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true

    const loadNotifications = async () => {
      setLoading(true)
      setLoadError('')

      const result = await getAlerts()
      if (!active) return

      const items = Array.isArray(result.data) ? result.data : []
      setNotifications(items.map((item) => ({
        id: item.id,
        source: item.source || 'user_notification',
        sourceId: item.source_id || null,
        type: item.type === 'alert' ? 'alerts' : 'system',
        title: item.title || '',
        message: item.message || item.body || '',
        read: Boolean(item.read),
        createdAt: item.created_at || new Date().toISOString(),
        icon: item.type === 'alert' ? '🔔' : '📌',
      })))

      if (!items.length && !result.fromMock) {
        setLoadError(t('notifications.empty'))
      }
      setLoading(false)
    }

    loadNotifications()
    return () => {
      active = false
    }
  }, [t])

  const filtered = useMemo(
    () => notifications.filter((notification) => filter === 'all' || notification.type === filter),
    [filter, notifications]
  )
  const unreadCount = notifications.filter((item) => !item.read).length

  const formatDate = (value) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    } catch {
      return value
    }
  }

  const markAllRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
    await markAllAlertsRead()
  }

  const handleOpenNotification = async (notification) => {
    if (notification.read || notification.source !== 'user_notification' || !notification.sourceId) return

    setNotifications((current) => current.map((item) => (
      item.id === notification.id ? { ...item, read: true } : item
    )))
    await markAlertRead(notification.sourceId)
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
            onClick={markAllRead}
            className="text-sm font-medium text-sage hover:underline"
          >
            {t('notifications.mark_read')}
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1 rounded-xl bg-softgray dark:bg-dm-border">
        {['all', 'alerts', 'system'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${filter === value
              ? 'bg-white dark:bg-dm-surface text-textdark dark:text-dm-text shadow-sm'
              : 'text-textdark/60 dark:text-dm-muted hover:text-textdark dark:hover:text-dm-text'
              }`}
          >
            {t(`notifications.filter_${value}`)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-8 h-8 border-4 border-sage border-t-transparent animate-spin rounded-full mb-4" />
            <p className="text-textdark/70 dark:text-dm-text/80 font-medium">
              {t('common.loading', 'Cargando...')}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 mb-5 rounded-full bg-sage/10 dark:bg-sage/20 flex flex-col items-center justify-center text-sage">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.866 8.21 8.21 0 003 2.48z" />
              </svg>
            </div>
            <p className="text-textdark/70 dark:text-dm-text/80 font-medium text-lg">
              {t('notifications.empty')}
            </p>
            {loadError && (
              <p className="text-sm text-textdark/50 dark:text-dm-muted mt-2">
                {loadError}
              </p>
            )}
          </div>
        ) : (
          filtered.map((notification) => (
            <button
              type="button"
              key={notification.id}
              onClick={() => handleOpenNotification(notification)}
              className={`flex w-full gap-4 p-4 rounded-2xl border transition-colors text-left ${notification.read
                ? 'bg-white dark:bg-dm-surface border-transparent shadow-soft'
                : 'bg-sage/5 dark:bg-sage/10 border-sage/20'
                }`}
            >
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-softgray dark:bg-dm-border text-lg">
                {notification.icon}
              </div>
              <div className="flex-1 min-w-0">
                {notification.title && (
                  <p className="text-xs uppercase tracking-wide text-textdark/50 dark:text-dm-muted mb-1">
                    {notification.title}
                  </p>
                )}
                <p className={`text-sm ${notification.read ? 'text-textdark/80 dark:text-dm-text/80' : 'text-textdark dark:text-dm-text font-medium'}`}>
                  {notification.message}
                </p>
                <p className="text-xs text-textdark/50 dark:text-dm-muted mt-1">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
              {!notification.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-sage mt-1.5 flex-shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
