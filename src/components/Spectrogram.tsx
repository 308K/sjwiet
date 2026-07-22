import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './icons'
import type { AcousticSnapshot, SpectrumOverlays, SpectrumOverlayKey } from '../types'

interface Props {
  analyser: AnalyserNode | null
  /** when false, the scroll loop freezes */
  active: boolean
  /** acoustic frames used for the pitch / formant / intensity overlays */
  history: AcousticSnapshot[]
  /** extra class on the wrapper (e.g. fill mode in fullscreen) */
  className?: string
  /** which acoustic overlays to draw (pitch / formants / intensity) */
  overlays?: SpectrumOverlays
  /** called when the user toggles an overlay via the legend */
  onToggleOverlay?: (key: SpectrumOverlayKey) => void
}

const DEFAULT_OVERLAYS: SpectrumOverlays = {
  pitch: true,
  f1: true,
  f2: true,
  intensity: true,
}

/* ── Perceptual color palette ─────────────────────────────────
   256-entry ramp built by interpolating OKLab between brand
   anchors: dark → indigo → trans-blue → trans-pink → white.
   (Canvas can't consume CSS `in oklch` gradients, so the
   interpolation is done in JS once at module load.)            */

const STOPS: ReadonlyArray<readonly [number, string]> = [
  [0.0, '#14130F'],
  [0.3, '#3457A5'],
  [0.55, '#5BCEFA'],
  [0.78, '#F5A9B8'],
  [1.0, '#FFFFFF'],
]

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function srgbToLinear(c255: number): number {
  const c = c255 / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, Math.round(v * 255)))
}

type Lab = readonly [number, number, number]

function rgbToOklab(r: number, g: number, b: number): Lab {
  const rl = srgbToLinear(r)
  const gl = srgbToLinear(g)
  const bl = srgbToLinear(b)
  const l = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl)
  const m = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl)
  const s = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

function buildPalette(): Uint8ClampedArray {
  const stops = STOPS.map(([t, hex]) => {
    const [r, g, b] = hexToRgb(hex)
    return [t, rgbToOklab(r, g, b)] as const
  })
  const palette = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let seg = 0
    while (seg < stops.length - 2 && t > stops[seg + 1][0]) seg++
    const [t0, lab0] = stops[seg]
    const [t1, lab1] = stops[seg + 1]
    const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0)
    const L = lab0[0] + (lab1[0] - lab0[0]) * k
    const a = lab0[1] + (lab1[1] - lab0[1]) * k
    const b = lab0[2] + (lab1[2] - lab0[2]) * k
    const [r, g, bl] = oklabToRgb(L, a, b)
    palette[i * 3] = r
    palette[i * 3 + 1] = g
    palette[i * 3 + 2] = bl
  }
  return palette
}

const PALETTE = buildPalette()

/* ── Display constants ──────────────────────────────────────── */
const MAX_FREQ = 4000
const TICKS: ReadonlyArray<readonly [number, string]> = [
  [500, '500'],
  [1000, '1k'],
  [2000, '2k'],
  [3000, '3k'],
  [4000, '4k'],
]
/** Pixels the view scrolls left per rendered frame. */
const STEP = 2
/** Intensity overlay scale (dB). */
const DB_MIN = 30
const DB_MAX = 95

const OVERLAY_COLORS = {
  pitch: '#FFFFFF',
  f1: '#F5A9B8',
  f2: '#5BCEFA',
  intensity: '#E5B558',
} as const

/**
 * Scrolling spectrogram: time runs left→right, frequency bottom→top
 * (0–4 kHz, the speech core band), energy is color-mapped through
 * the brand palette. Pitch (white), F1 (pink), F2 (blue) and
 * intensity (amber) are drawn as synchronized overlay curves.
 */
export default function Spectrogram({ analyser, active, history, className, overlays, onToggleOverlay }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const activeRef = useRef(active)
  activeRef.current = active
  const historyRef = useRef(history)
  historyRef.current = history
  const overlaysRef = useRef(overlays ?? DEFAULT_OVERLAYS)
  overlaysRef.current = overlays ?? DEFAULT_OVERLAYS
  const lastFrameAt = useRef(0)
  const fpsEma = useRef(60)

  useEffect(() => {
    if (!analyser) return
    analyser.minDecibels = -85
    analyser.maxDecibels = -30
    analyser.smoothingTimeConstant = 0.5
  }, [analyser])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      if (!activeRef.current || !analyser) return

      // Track real frame rate so overlay time↔pixel mapping stays accurate.
      const nowPerf = performance.now()
      if (lastFrameAt.current > 0) {
        const dt = nowPerf - lastFrameAt.current
        if (dt > 0) fpsEma.current = fpsEma.current * 0.9 + (1000 / dt) * 0.1
      }
      lastFrameAt.current = nowPerf

      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        ctx.fillStyle = '#14130F'
        ctx.fillRect(0, 0, w, h)
      }

      const binCount = analyser.frequencyBinCount
      const nyquist = analyser.context.sampleRate / 2
      const maxBin = Math.min(binCount, Math.floor(binCount * (MAX_FREQ / nyquist)))
      const data = new Uint8Array(binCount)
      analyser.getByteFrequencyData(data)

      // 1) Scroll existing bitmap left, paint the newest column strip.
      ctx.drawImage(canvas, -STEP, 0)
      const strip = ctx.createImageData(STEP, h)
      const px = strip.data
      for (let row = 0; row < h; row++) {
        const frac = 1 - row / (h - 1)
        const bin = Math.min(maxBin - 1, Math.floor(frac * maxBin))
        const v = data[bin]
        const pr = PALETTE[v * 3]
        const pg = PALETTE[v * 3 + 1]
        const pb = PALETTE[v * 3 + 2]
        for (let col = 0; col < STEP; col++) {
          const idx = (row * STEP + col) * 4
          px[idx] = pr
          px[idx + 1] = pg
          px[idx + 2] = pb
          px[idx + 3] = 255
        }
      }
      ctx.putImageData(strip, w - STEP, 0)

      // 2) Overlay acoustic curves on top (CSS-pixel space).
      const entries = historyRef.current
      if (entries.length === 0) return

      const wCss = w / dpr
      const hCss = h / dpr
      const cssPxPerSec = (STEP * fpsEma.current) / dpr
      const nowMs = Date.now()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'

      const yFreq = (v: number) =>
        hCss - (Math.min(Math.max(v, 0), MAX_FREQ) / MAX_FREQ) * hCss
      const yDb = (v: number) =>
        hCss - Math.min(Math.max((v - DB_MIN) / (DB_MAX - DB_MIN), 0), 1) * hCss

      const drawSeries = (
        pick: (e: AcousticSnapshot) => number,
        yMap: (v: number) => number,
        color: string,
        width: number,
      ) => {
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.beginPath()
        let pen = false
        let prevT = -Infinity
        for (const e of entries) {
          const x = wCss - ((nowMs - e.t) / 1000) * cssPxPerSec
          if (x < 0) break
          const v = pick(e)
          const gapOk = e.t - prevT < 400
          prevT = e.t
          if (!Number.isFinite(v) || (pen && !gapOk)) {
            pen = false
            continue
          }
          const y = yMap(v)
          if (!pen) {
            ctx.moveTo(x, y)
            pen = true
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      }

      // Intensity first (under everything), then F1/F2, pitch on top.
      const ov = overlaysRef.current
      if (ov.intensity) drawSeries((e) => e.intensity, yDb, OVERLAY_COLORS.intensity, 1.25)
      if (ov.f1) drawSeries((e) => (e.voiced ? e.f1 : NaN), yFreq, OVERLAY_COLORS.f1, 1.5)
      if (ov.f2) drawSeries((e) => (e.voiced ? e.f2 : NaN), yFreq, OVERLAY_COLORS.f2, 1.5)
      if (ov.pitch) {
        // Pitch: dark halo then white core so it reads on bright regions.
        drawSeries((e) => (e.voiced ? e.pitch : NaN), yFreq, 'rgba(0,0,0,0.55)', 3.5)
        drawSeries((e) => (e.voiced ? e.pitch : NaN), yFreq, OVERLAY_COLORS.pitch, 1.5)
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyser])

  return (
    <div className={`spectrum-wrap${className ? ` ${className}` : ''}`}>
      <span className="spectrum-wrap__badge tag tag-sm tag-seal">
        <Icon.activity size={13} /> {active ? t('spectrum.live') : t('spectrum.paused')}
      </span>
      <canvas ref={canvasRef} aria-label="audio spectrogram" />
      <div className="spectrogram-ticks" aria-hidden="true">
        {TICKS.map(([freq, label]) => (
          <div
            key={freq}
            className="spectrogram-tick"
            style={{ top: `${(1 - freq / MAX_FREQ) * 100}%` }}
          >
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div
        className={`spectrogram-legend${onToggleOverlay ? ' spectrogram-legend--interactive' : ''}`}
        aria-hidden={onToggleOverlay ? undefined : true}
      >
        {([
          { key: 'pitch' as const, label: t('metrics.pitch'), color: OVERLAY_COLORS.pitch },
          { key: 'f1' as const, label: 'F1', color: OVERLAY_COLORS.f1 },
          { key: 'f2' as const, label: 'F2', color: OVERLAY_COLORS.f2 },
          { key: 'intensity' as const, label: t('metrics.intensity'), color: OVERLAY_COLORS.intensity },
        ]).map((it) => {
          const on = (overlays ?? DEFAULT_OVERLAYS)[it.key]
          if (!onToggleOverlay) {
            return (
              <span key={it.key} className="spectrogram-legend__item">
                <i style={{ background: it.color }} /> {it.label}
              </span>
            )
          }
          return (
            <button
              key={it.key}
              type="button"
              className="spectrogram-legend__btn"
              aria-pressed={on}
              title={t('spectrum.toggleOverlay', { name: it.label })}
              aria-label={t('spectrum.toggleOverlay', { name: it.label })}
              onClick={() => onToggleOverlay(it.key)}
            >
              <i style={{ background: it.color }} /> {it.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
