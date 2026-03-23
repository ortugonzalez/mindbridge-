import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { inviteContact, getSupportNetwork } from '../services/api'

const STORAGE_KEY = 'breso_trusted_contacts'

function safeGetContacts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function safeSaveContacts(contacts) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts)) } catch { }
}

export default function Contacts() {
  const { t } = useTranslation()
  const [contacts, setContacts] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', relationship: '' })
  const [saving, setSaving] = useState(false)

  // FIX 2: load from backend, fallback to localStorage
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const res = await getSupportNetwork()
          if (!mounted) return
          const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
          if (items.length > 0) {
            setContacts(items.map((c, i) => ({
              id: c.id || i,
              name: c.name || c.contact_name || '',
              relationship: c.relationship || c.relation || '',
              email: c.email || '',
              phone: c.phone || '',
              status: c.status || 'active',
            })))
            return
          }
        } catch { }
        if (mounted) setContacts(safeGetContacts())
      })()
    return () => { mounted = false }
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const newContact = {
      id: Date.now(),
      name: form.name.trim(),
      email: form.email.trim(),
      relationship: form.relationship.trim(),
      phone: '',
      status: 'pending',
    }
    try {
      await inviteContact({ email: form.email, name: form.name, relationship: form.relationship })
      alert(t('contacts.inviteSent', { email: form.email }))
    } catch { }
    const updated = [...contacts, newContact]
    setContacts(updated)
    safeSaveContacts(updated)
    setSaving(false)
    setShowAddModal(false)
    setForm({ name: '', email: '', relationship: '' })
  }

  const removeContact = (id) => {
    if (window.confirm(t('contacts.confirm_remove'))) {
      const updated = contacts.filter(c => c.id !== id)
      setContacts(updated)
      safeSaveContacts(updated)
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
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white dark:bg-dm-surface rounded-2xl border border-dashed border-softgray dark:border-dm-border">
            <svg className="w-20 h-20 mb-5 text-[#8BA989] opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="text-textdark/70 dark:text-dm-text/80 font-medium text-lg mb-2">
              {t('contacts.emptyTitle')}
            </p>
            <p className="text-textdark/50 dark:text-dm-muted text-sm mb-6 max-w-xs">
              {t('contacts.emptyDesc')}
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 bg-sage text-white rounded-xl text-sm font-semibold hover:bg-sage/90 shadow-soft transition-transform hover:-translate-y-0.5"
            >
              + {t('contacts.add_new')}
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
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                  <span className="text-xs font-semibold text-sage">{t('contacts.status_active')}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2 text-textdark/80 dark:text-dm-text/80">
                    <span>✉️</span> {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-textdark/80 dark:text-dm-text/80">
                    <span>📱</span> {contact.phone}
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in-page">
          <div className="w-full max-w-sm bg-white dark:bg-dm-surface rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => { setShowAddModal(false); setForm({ name: '', email: '', relationship: '' }) }}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full hover:bg-softgray dark:hover:bg-dm-border text-textdark/40 dark:text-dm-muted"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-textdark dark:text-dm-text mb-6">
              {t('contacts.modal_title')}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t('dashboard.contactFormName')}
                className="w-full rounded-xl border-softgray dark:border-dm-border bg-softgray/50 dark:bg-dm-bg px-4 py-3 text-sm text-textdark dark:text-dm-text outline-none transition-all placeholder:text-textdark/40 dark:placeholder:text-dm-muted border"
              />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder={t('dashboard.contactFormEmail')}
                className="w-full rounded-xl border-softgray dark:border-dm-border bg-softgray/50 dark:bg-dm-bg px-4 py-3 text-sm text-textdark dark:text-dm-text outline-none transition-all placeholder:text-textdark/40 dark:placeholder:text-dm-muted border"
              />
              <input
                type="text"
                value={form.relationship}
                onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
                placeholder={t('dashboard.contactFormRelation')}
                className="w-full rounded-xl border-softgray dark:border-dm-border bg-softgray/50 dark:bg-dm-bg px-4 py-3 text-sm text-textdark dark:text-dm-text outline-none transition-all placeholder:text-textdark/40 dark:placeholder:text-dm-muted border"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving || !form.name.trim()}
                className="w-full rounded-xl bg-sage py-3.5 text-sm font-semibold text-white shadow-soft transition-transform hover:scale-[1.02] active:scale-95 mt-2 disabled:opacity-50"
              >
                {saving ? t('dashboard.contactSaving') : t('dashboard.contactSave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
