import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function Notifications() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all') // 'all' | 'alerts' | 'system'

  // Mock notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'alert',
      message: t('notifications.mock_1_message', 'Soledad envió un mensaje a tu contacto María.'),
      date: t('notifications.mock_1_date', 'Hoy, 14:30'),
      read: false,
      icon: '🔔'
    },
    {
      id: 2,
      type: 'system',
      message: t('notifications.mock_2_message', 'Tu reporte mensual ya está disponible.'),
      date: t('notifications.mock_2_date', 'Ayer, 09:00'),
      read: true,
      icon: '📊'
    }
  ])

  const isPatient = localStorage.getItem('breso_user_type') === 'patient' || !localStorage.getItem('breso_user_type')
  const visibleNotifications = notifications.filter(n => !(isPatient && n.type === 'family_alert_sent'))
  const filtered = visibleNotifications.filter(n => filter === 'all' || n.type === filter)
  const unreadCount = visibleNotifications.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
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

      {/* Filters */}
      <div className="flex gap-2 p-1 rounded-xl bg-softgray dark:bg-dm-border">
        {['all', 'alerts', 'system'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${filter === f
                ? 'bg-white dark:bg-dm-surface text-textdark dark:text-dm-text shadow-sm'
                : 'text-textdark/60 dark:text-dm-muted hover:text-textdark dark:hover:text-dm-text'
              }`}
          >
            {t(`notifications.filter_${f}`)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
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
          filtered.map(notification => (
            <div
              key={notification.id}
              className={`flex gap-4 p-4 rounded-2xl border transition-colors ${notification.read
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
            </div>
          ))
        )}
      </div>
    </div>
  )
}
