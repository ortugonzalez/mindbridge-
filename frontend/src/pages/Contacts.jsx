import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function Contacts() {
  const { t } = useTranslation()
  const [contacts, setContacts] = useState([
    {
      id: 1,
      name: 'María García',
      relationship: 'Hermana',
      phone: '+54 11 9876 5432',
      email: 'maria@example.com',
      status: 'active' // 'active' | 'pending'
    }
  ])
  const [showAddModal, setShowAddModal] = useState(false)

  // Assuming user is patient. For family type, we would show a different view.
  // Mapped based on generic user schema plan.

  const removeContact = (id) => {
    if (window.confirm(t('contacts.confirm_remove'))) {
      setContacts(contacts.filter(c => c.id !== id))
    }
  }

  return (
    <div className="animate-fade-in-page space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
          {t('contacts.title')}
        </h1>
        <button 
          type="button" 
          onClick={() => setShowAddModal(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-sage text-white shadow-soft transition-transform hover:scale-105"
        >
          +
        </button>
      </div>

      <div className="space-y-4">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-dm-surface rounded-2xl border border-dashed border-softgray dark:border-dm-border">
            <div className="h-16 w-16 mb-4 flex items-center justify-center text-3xl">🤝</div>
            <p className="text-textdark/60 dark:text-dm-muted font-medium mb-4">
              {t('contacts.empty')}
            </p>
            <button 
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-sage text-white rounded-xl text-sm font-medium hover:bg-sage/90 transition-colors"
            >
              {t('contacts.add_new')}
            </button>
          </div>
        ) : (
          contacts.map(contact => (
            <div key={contact.id} className="bg-white dark:bg-dm-surface p-5 rounded-2xl shadow-soft space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-textdark dark:text-dm-text">{contact.name}</h3>
                  <p className="text-sm text-textdark/60 dark:text-dm-muted capitalize">{contact.relationship}</p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  contact.status === 'active' 
                    ? 'bg-sage/10 text-sage dark:bg-sage/20' 
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'
                }`}>
                  {t(`contacts.status_${contact.status}`)}
                </div>
              </div>
              
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-textdark/80 dark:text-dm-text/80">
                  <span>📱</span> {contact.phone}
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2 text-textdark/80 dark:text-dm-text/80">
                    <span>✉️</span> {contact.email}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-softgray dark:border-dm-border flex justify-end">
                <button 
                  type="button" 
                  onClick={() => removeContact(contact.id)}
                  className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  {t('contacts.remove')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in-page">
          <div className="w-full max-w-sm bg-white dark:bg-dm-surface rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full hover:bg-softgray dark:hover:bg-dm-border text-textdark/40 dark:text-dm-muted"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-textdark dark:text-dm-text mb-6">
              {t('contacts.modal_title')}
            </h2>
            <div className="space-y-4">
              <input type="text" placeholder={t('dashboard.contactFormName')} className="w-full rounded-xl border-softgray dark:border-dm-border bg-softgray/50 dark:bg-dm-bg px-4 py-3 text-sm text-textdark dark:text-dm-text outline-none transition-all placeholder:text-textdark/40 dark:placeholder:text-dm-muted border" />
              <input type="text" placeholder={t('dashboard.contactFormRelation')} className="w-full rounded-xl border-softgray dark:border-dm-border bg-softgray/50 dark:bg-dm-bg px-4 py-3 text-sm text-textdark dark:text-dm-text outline-none transition-all placeholder:text-textdark/40 dark:placeholder:text-dm-muted border" />
              <input type="tel" placeholder={t('onboarding.contactPhone')} className="w-full rounded-xl border-softgray dark:border-dm-border bg-softgray/50 dark:bg-dm-bg px-4 py-3 text-sm text-textdark dark:text-dm-text outline-none transition-all placeholder:text-textdark/40 dark:placeholder:text-dm-muted border" />
              <button 
                onClick={() => setShowAddModal(false)} 
                className="w-full rounded-xl bg-sage py-3.5 text-sm font-semibold text-white shadow-soft transition-transform hover:scale-[1.02] active:scale-95 mt-2"
              >
                {t('dashboard.contactSave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
