import { useTranslation } from 'react-i18next'
import type { AcousticSnapshot, TargetConfig } from '../types'
import { Icon } from './icons'

interface Props {
  snap: AcousticSnapshot | null
  targets: TargetConfig
  /** 0–100 stability score */
  score: number
}

type FeedbackKey =
  | 'pitchIn' | 'pitchLow' | 'pitchHigh'
  | 'resonanceLow' | 'resonanceHigh'
  | 'intensityLow' | 'intensityHigh'
  | 'unvoiced' | 'idle'

function pickFeedback(snap: AcousticSnapshot | null, targets: TargetConfig): { key: FeedbackKey; kind: 'good' | 'hint' } {
  if (!snap || !snap.voiced) return { key: 'idle', kind: 'hint' }
  const { pitch, f1, f2, intensity } = snap

  const pitchLo = targets.pitchMin
  const pitchHi = targets.pitchMax
  const f1Lo = targets.f1 - targets.tolerance
  const f1Hi = targets.f1 + targets.tolerance
  const f2Lo = targets.f2 - targets.tolerance
  const f2Hi = targets.f2 + targets.tolerance

  const pitchIn = pitch >= pitchLo && pitch <= pitchHi
  const resoIn = f1 >= f1Lo && f1 <= f1Hi && f2 >= f2Lo && f2 <= f2Hi

  if (!pitchIn) {
    return { key: pitch < pitchLo ? 'pitchLow' : 'pitchHigh', kind: 'hint' }
  }
  if (intensity < 50) return { key: 'intensityLow', kind: 'hint' }
  if (intensity > 80) return { key: 'intensityHigh', kind: 'hint' }
  if (!resoIn) {
    return { key: f1 > targets.f1 ? 'resonanceHigh' : 'resonanceLow', kind: 'hint' }
  }
  return { key: 'pitchIn', kind: 'good' }
}

export default function PracticePanel({ snap, targets, score }: Props) {
  const { t } = useTranslation()
  const fb = pickFeedback(snap, targets)
  const FbIcon = fb.kind === 'good' ? Icon.check : Icon.bulb

  return (
    <div className="card parchment">
      <div className="card-header">
        <h3 className="card-title">
          <Icon.bulb size={18} style={{ verticalAlign: '-3px', marginRight: 6, color: 'var(--color-primary)' }} />
          {t('practice.title')}
        </h3>
        <p className="section-subtitle">{t('practice.subtitle')}</p>
      </div>
      <div className="card-body stack-sm">
        <div className="score" style={{ ['--score' as string]: score }}>
          <div className="score__ring">
            <span className="score__num">{Math.round(score)}</span>
          </div>
          <div className="score__meta">
            <p className="metric__label" style={{ marginBottom: 2 }}>{t('practice.score')}</p>
            <p className="text-caption text-muted">{t('practice.scoreHint')}</p>
          </div>
        </div>

        <div className={`feedback feedback--${fb.kind}`} role="status">
          <FbIcon size={18} />
          <div>
            <p className="feedback__title">{t(`practice.feedback.${fb.key}`)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
