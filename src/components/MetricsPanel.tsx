import type { AcousticSnapshot } from '../types'
import { useTranslation } from 'react-i18next'
import { Icon } from './icons'

interface Props {
  snap: AcousticSnapshot | null
  targets: { pitchMin: number; pitchMax: number; f1: number; f2: number; tolerance: number }
}

function fmt(n: number, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

function RangeStatus({ value, lo, hi }: { value: number; lo: number; hi: number }) {
  const { t } = useTranslation()
  const inRange = Number.isFinite(value) && value >= lo && value <= hi
  return (
    <span className={`metric__status ${inRange ? 'metric__status--in' : 'metric__status--out'}`}>
      <Icon.check size={12} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
      {inRange ? t('metrics.inRange') : t('metrics.outRange')}
    </span>
  )
}

export default function MetricsPanel({ snap, targets }: Props) {
  const { t } = useTranslation()
  const voiced = snap?.voiced ?? false

  const metrics = [
    {
      label: t('metrics.pitch'),
      icon: Icon.gauge,
      value: voiced ? fmt(snap!.pitch) : '—',
      unit: 'Hz',
      status: snap && voiced ? <RangeStatus value={snap.pitch} lo={targets.pitchMin} hi={targets.pitchMax} /> : null,
    },
    {
      label: t('metrics.formant1'),
      icon: Icon.waves,
      value: voiced ? fmt(snap!.f1) : '—',
      unit: 'Hz',
      status: snap && voiced ? <RangeStatus value={snap.f1} lo={targets.f1 - targets.tolerance} hi={targets.f1 + targets.tolerance} /> : null,
    },
    {
      label: t('metrics.formant2'),
      icon: Icon.waves,
      value: voiced ? fmt(snap!.f2) : '—',
      unit: 'Hz',
      status: snap && voiced ? <RangeStatus value={snap.f2} lo={targets.f2 - targets.tolerance} hi={targets.f2 + targets.tolerance} /> : null,
    },
    {
      label: t('metrics.intensity'),
      icon: Icon.activity,
      value: voiced ? fmt(snap!.intensity, 1) : '—',
      unit: 'dB',
      status: null,
    },
  ]

  return (
    <div className="metric-grid">
      {metrics.map((m) => {
        const Ic = m.icon
        return (
          <div className="metric" key={m.label}>
            <div className="metric__label">
              <Ic size={14} /> {m.label}
            </div>
            <div className="metric__value">
              {m.value}
              {m.unit && m.value !== '—' && <span className="metric__unit"> {m.unit}</span>}
            </div>
            {m.status}
          </div>
        )
      })}
    </div>
  )
}
