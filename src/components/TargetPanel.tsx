import { useTranslation } from 'react-i18next'
import type { TargetConfig } from '../types'
import { Icon } from './icons'

interface Props {
  targets: TargetConfig
  onChange: (next: TargetConfig) => void
}

const PRESETS: Record<string, Partial<TargetConfig>> = {
  fem: { pitchMin: 180, pitchMax: 300, f1: 850, f2: 2100, tolerance: 40 },
  masc: { pitchMin: 90, pitchMax: 180, f1: 600, f2: 1100, tolerance: 40 },
  androgynous: { pitchMin: 140, pitchMax: 230, f1: 700, f2: 1600, tolerance: 50 },
}

export default function TargetPanel({ targets, onChange }: Props) {
  const { t } = useTranslation()

  const set = (patch: Partial<TargetConfig>) => onChange({ ...targets, ...patch })

  const field = (key: keyof TargetConfig, label: string, min: number, max: number, step: number) => (
    <div className="input-group input-underlined">
      <label htmlFor={`tg-${key}`}>{label}</label>
      <input
        id={`tg-${key}`}
        className="input-field"
        type="number"
        value={targets[key]}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) set({ [key]: v } as Partial<TargetConfig>)
        }}
      />
    </div>
  )

  return (
    <div className="card parchment">
      <div className="card-header">
        <h3 className="card-title">
          <Icon.target size={18} style={{ verticalAlign: '-3px', marginRight: 6, color: 'var(--color-primary)' }} />
          {t('targets.title')}
        </h3>
        <p className="section-subtitle">{t('targets.subtitle')}</p>
      </div>
      <div className="card-body stack-sm">
        <div className="preset-row">
          {(['fem', 'masc', 'androgynous'] as const).map((p) => (
            <button
              key={p}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onChange({ ...targets, ...PRESETS[p] })}
            >
              {t(`targets.preset.${p}`)}
            </button>
          ))}
        </div>
        <div className="target-form">
          {field('pitchMin', t('targets.pitchMin'), 50, 600, 1)}
          {field('pitchMax', t('targets.pitchMax'), 50, 600, 1)}
          {field('f1', t('targets.formant1Target'), 200, 1500, 1)}
          {field('f2', t('targets.formant2Target'), 500, 3500, 1)}
          {field('tolerance', 'Tolerance (Hz)', 10, 120, 1)}
        </div>
      </div>
    </div>
  )
}
