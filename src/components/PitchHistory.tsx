import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { AcousticSnapshot } from '../types'

interface Props {
  history: AcousticSnapshot[]
  targets: { pitchMin: number; pitchMax: number }
  /** window length in seconds */
  windowSec?: number
}

/** Scrolling line chart of recent pitch trajectory with the target zone. */
export default function PitchHistory({ history, targets, windowSec = 30 }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // y-axis range: cover targets plus a margin, clamp to [0, 600]
    const yMin = Math.max(0, Math.min(50, targets.pitchMin - 80))
    const yMax = Math.min(600, Math.max(400, targets.pitchMax + 80))
    const x0 = 36
    const x1 = w - 8
    const y0 = 8
    const y1 = h - 18

    const toX = (ageSec: number) => x1 - (ageSec / windowSec) * (x1 - x0)
    const toY = (pitch: number) => y1 - ((pitch - yMin) / (yMax - yMin)) * (y1 - y0)

    // target zone band
    ctx.fillStyle = 'rgba(91,206,250,0.14)'
    const zTop = toY(targets.pitchMax)
    const zBot = toY(targets.pitchMin)
    ctx.fillRect(x0, zTop, x1 - x0, zBot - zTop)
    ctx.strokeStyle = 'rgba(245,169,184,0.7)'
    ctx.setLineDash([4, 3])
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x0, zTop); ctx.lineTo(x1, zTop); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x0, zBot); ctx.lineTo(x1, zBot); ctx.stroke()
    ctx.setLineDash([])

    // axes
    ctx.strokeStyle = 'rgba(127,127,127,0.25)'
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke()
    ctx.fillStyle = 'rgba(127,127,127,0.8)'
    ctx.font = '10px system-ui, sans-serif'
    ctx.fillText(String(Math.round(yMax)), 6, y0 + 10)
    ctx.fillText(String(Math.round(yMin)), 6, y1)
    ctx.fillText(t('metrics.pitch'), 6, y0 - 0)

    // pitch line
    const now = Date.now()
    const pts = history.filter((s) => s.voiced && Number.isFinite(s.pitch))
    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(x0, 0, x1, 0)
      grad.addColorStop(0, '#5BCEFA')
      grad.addColorStop(1, '#F5A9B8')
      ctx.strokeStyle = grad
      ctx.lineWidth = 2
      ctx.beginPath()
      let started = false
      for (const p of pts) {
        const age = (now - p.t) / 1000
        if (age > windowSec) continue
        const x = toX(age)
        const y = toY(p.pitch)
        if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
      }
      ctx.stroke()
    } else {
      ctx.fillStyle = 'rgba(127,127,127,0.6)'
      ctx.font = '12px system-ui, sans-serif'
      ctx.fillText(t('history.empty'), x0 + 8, h / 2)
    }
  }, [history, targets, windowSec, t])

  return (
    <div className="history-wrap">
      <canvas ref={canvasRef} aria-label="pitch history" />
    </div>
  )
}
