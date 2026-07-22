import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './icons'
import { supportedLanguages } from '../i18n'

export default function LanguageMenu() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const current = i18n.resolvedLanguage?.slice(0, 2) ?? 'zh'

  return (
    <div className="lang-menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('actions.changeLanguage')}
        title={t('actions.changeLanguage')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon.languages size={18} />
      </button>
      {open && (
        <div className="lang-menu__list" role="listbox" aria-label={t('actions.changeLanguage')}>
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-checked={current === lang.code}
              className="lang-menu__item"
              onClick={() => {
                void i18n.changeLanguage(lang.code)
                setOpen(false)
              }}
            >
              {t(lang.labelKey)}
              {current === lang.code && <Icon.check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
