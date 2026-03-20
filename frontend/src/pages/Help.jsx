import { useTranslation } from 'react-i18next'

export default function Help() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">{t('nav.help')}</h1>
      <p className="text-textdark/50 dark:text-dm-muted">{t('common.comingSoon')}</p>
    </div>
  )
}
