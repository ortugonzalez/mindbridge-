import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function Help() {
  const { t } = useTranslation()
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = [1, 2, 3, 4, 5, 6].map(num => ({
    id: num,
    q: t(`help.faq${num}_q`),
    a: t(`help.faq${num}_a`)
  }))

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id)
  }

  const crisisNumbers = [
    { country: '🇦🇷 Argentina', number: '135' },
    { country: '🇲🇽 México', number: '800-290-0024' },
    { country: '🇨🇴 Colombia', number: '106' },
    { country: '🇨🇱 Chile', number: '600-360-7577' },
    { country: '🇪🇸 España', number: '024' },
    { country: '🇺🇸 USA (español)', number: '988' }
  ]

  return (
    <div className="animate-fade-in-page space-y-8 pb-12">
      <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
        {t('help.title')}
      </h1>

      {/* Prominent Crisis Block */}
      <div className="bg-[#FEF2F2] dark:bg-[#3B1F1F] border-2 border-[#EF4444] rounded-2xl p-6 shadow-md">
        <h2 className="text-xl font-black text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
          <span>🚨</span> {t('help.crisis_main_title')}
        </h2>
        <p className="text-sm text-red-800/80 dark:text-red-200/80 font-medium mb-6">
          {t('help.crisis_subtitle')}
        </p>

        <div className="space-y-4">
          {crisisNumbers.map((item) => (
            <div key={item.country} className="flex flex-col sm:flex-row sm:items-center justify-between border-b last:border-0 border-red-200 dark:border-red-900/50 pb-3 last:pb-0 gap-1">
              <span className="text-base font-semibold text-red-900/80 dark:text-red-100/80">{item.country}</span>
              <a href={`tel:${item.number.replace(/\\D/g, '')}`} className="text-[24px] font-bold text-[#EF4444] hover:underline">
                {item.number}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold tracking-wider text-textdark/60 dark:text-dm-muted uppercase px-1">
          {t('help.faq_title')}
        </h2>
        
        <div className="bg-white dark:bg-dm-surface rounded-2xl shadow-soft overflow-hidden divide-y divide-softgray dark:divide-dm-border">
          {faqs.map((faq) => (
            <div key={faq.id} className="last:border-b-0">
              <button
                type="button"
                onClick={() => toggleFaq(faq.id)}
                className="w-full text-left px-5 py-4 flex items-center justify-between text-textdark dark:text-dm-text hover:bg-softgray/30 dark:hover:bg-dm-bg/30 transition-colors focus:outline-none"
              >
                <span className="font-medium pr-4">{faq.q}</span>
                <span className={`text-sage transition-transform duration-300 flex-shrink-0 ${openFaq === faq.id ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === faq.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="px-5 pb-4 text-sm text-textdark/70 dark:text-dm-text/70 leading-relaxed">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Support & About */}
      <div className="bg-white dark:bg-dm-surface rounded-2xl p-6 shadow-soft space-y-4">
        <div className="py-2 space-y-1">
          <a
            href="mailto:hola@breso.app"
            className="flex justify-between items-center text-textdark dark:text-dm-text hover:text-sage dark:hover:text-sage transition-colors font-medium"
          >
            {t('help.contact_support')} — hola@breso.app
            <span>✉️</span>
          </a>
          <p className="text-xs text-textdark/50 dark:text-dm-muted">Respondemos en menos de 48 horas.</p>
        </div>
        <hr className="border-softgray dark:border-dm-border" />
        <div className="py-2 space-y-1">
          <p className="font-medium text-textdark dark:text-dm-text">{t('help.about')}</p>
          <div className="flex justify-between items-center text-sm text-textdark/60 dark:text-dm-muted">
            <span>{t('help.version')} 1.0.0</span>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-sage">GitHub↗</a>
          </div>
        </div>
      </div>

      {/* Footer Emergency Disclaimer */}
      <p className="text-xs text-center italic text-textdark/50 dark:text-dm-muted px-4 mt-8">
        {t('help.emergency_disclaimer')}
      </p>
    </div>
  )
}
