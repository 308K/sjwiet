import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import './index.css'

import { AudioEngine } from './audio/engine'
import { loadPraat, analyzeWindow, analyzeFile, bufferToMono, resample } from './audio/praat'
import type { AcousticSnapshot, TargetConfig, SpectrumOverlays, SpectrumOverlayKey } from './types'

import Spectrogram from './components/Spectrogram'
import MetricsPanel from './components/MetricsPanel'
import PitchHistory from './components/PitchHistory'
import TargetPanel from './components/TargetPanel'
import PracticePanel from './components/PracticePanel'
import LanguageMenu from './components/LanguageMenu'
import { Icon } from './components/icons'

const DEFAULT_TARGETS: TargetConfig = {
  pitchMin: 165,
  pitchMax: 255,
  f1: 800,
  f2: 1900,
  tolerance: 40,
}

type EngineStatus = 'loading' | 'ready' | 'error'

const RESOURCE_LINKS = [
  { lang: '中文', label: 'Voice Resource Project', url: 'https://transvoice-wiki.mtf.wiki/' },
  { lang: '中文', label: 'MTF声音女性化练习手册', url: 'https://mtf-voice-training.vercel.app/' },
  { lang: 'English', label: 'Voice Resource Project', url: 'https://wiki.sumianvoice.com/' },
] as const

export default function App() {
  const { t } = useTranslation()

  const engineRef = useRef<AudioEngine | null>(null)
  const praatRef = useRef<Awaited<ReturnType<typeof loadPraat>> | null>(null)

  const [status, setStatus] = useState<EngineStatus>('loading')
  const [source, setSource] = useState<'mic' | 'file' | null>(null)
  const [snap, setSnap] = useState<AcousticSnapshot | null>(null)
  const [history, setHistory] = useState<AcousticSnapshot[]>([])
  const [targets, setTargets] = useState<TargetConfig>(DEFAULT_TARGETS)
  const [fileInfo, setFileInfo] = useState<{ name: string; analysis: ReturnType<typeof Object> | null } | null>(null)
  const [dark, setDark] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [overlays, setOverlays] = useState<SpectrumOverlays>({
    pitch: true,
    f1: true,
    f2: true,
    intensity: true,
  })

  const toggleOverlay = useCallback((key: SpectrumOverlayKey) => {
    setOverlays((o) => ({ ...o, [key]: !o[key] }))
  }, [])

  const scoreRef = useRef(0)
  const [score, setScore] = useState(0)

  // ── Init engine + praat ─────────────────────────────────────
  useEffect(() => {
    const engine = new AudioEngine()
    engineRef.current = engine
    let cancelled = false
    loadPraat()
      .then((p) => {
        if (cancelled) return
        praatRef.current = p
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      engine.dispose()
    }
  }, [])

  // ── Theme ───────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // ── Analysis loop (rAF-throttled, ~10 Hz praat calls) ───────
  const lastPraatRef = useRef(0)
  useEffect(() => {
    if (status !== 'ready') return
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const engine = engineRef.current
      const praat = praatRef.current
      if (!engine || !praat) return
      if (!engine.state.running) return

      const now = performance.now()
      if (now - lastPraatRef.current < 100) return
      lastPraatRef.current = now

      const windowSec = engine.state.kind === 'mic' ? 1.0 : 0.5
      const samples = engine.ring.tail(Math.floor(engine.sampleRate * windowSec))
      if (samples.length < engine.sampleRate * 0.2) return

      void analyzeWindow(praat, samples, engine.sampleRate).then((frame) => {
        const next: AcousticSnapshot = {
          pitch: frame.pitch,
          f1: frame.f1,
          f2: frame.f2,
          f3: frame.f3,
          intensity: frame.intensity,
          voiced: frame.voiced,
          t: Date.now(),
        }
        setSnap(next)
        setHistory((h) => {
          const cut = Date.now() - 30000
          const trimmed = h.filter((p) => p.t >= cut)
          return [...trimmed, next].slice(-600)
        })
      })
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status])

  // ── Stability score: EMA of "in target" ratio ───────────────
  useEffect(() => {
    if (!snap || !snap.voiced) return
    const inPitch = snap.pitch >= targets.pitchMin && snap.pitch <= targets.pitchMax
    const inF1 = Math.abs(snap.f1 - targets.f1) <= targets.tolerance
    const inF2 = Math.abs(snap.f2 - targets.f2) <= targets.tolerance
    const hit = (inPitch ? 0.5 : 0) + (inF1 && inF2 ? 0.5 : 0)
    scoreRef.current = scoreRef.current * 0.85 + hit * 100 * 0.15
    setScore(scoreRef.current)
  }, [snap, targets])

  // ── Controls ────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    try {
      await engine.startMic()
      setSource('mic')
      setFileInfo(null)
    } catch {
      setSource(null)
    }
  }, [])

  const stop = useCallback(() => {
    engineRef.current?.stop()
    setSource(null)
    setSnap(null)
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      const engine = engineRef.current
      const praat = praatRef.current
      if (!engine || !praat) return
      setFileInfo({ name: file.name, analysis: null })
      try {
        // Play through analyser for live spectrum + capture
        await engine.startFile(file)
        setSource('file')
        // Offline whole-file summary
        const buffer = await engine.decodeFile(file)
        const mono = resample(bufferToMono(buffer), buffer.sampleRate, 16000)
        const analysis = await analyzeFile(praat, mono, 16000)
        setFileInfo({ name: file.name, analysis: analysis as unknown as object })
      } catch {
        setFileInfo(null)
        setSource(null)
      }
    },
    [],
  )

  // ── ESC exits fullscreen ────────────────────────────────────
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void handleFile(f)
    e.target.value = ''
  }

  const active = (source !== null && status === 'ready')

  const fileAnalysis = fileInfo?.analysis as
    | { duration: number; meanPitch: number; meanF1: number; meanF2: number; meanIntensity: number; voicedRatio: number }
    | null
    | undefined

  return (
    <>
      <header className="app-header">
        <div className="app-header__brand">
          <span className="brand-logo brand-logo--lg" aria-hidden="true" />
          <div className="brand-name">{t('app.name')}</div>
        </div>
        <div className="app-header__actions">
          <span className="status-line">
            {status === 'loading' && (<><Icon.spinner size={14} className="spin" /> {t('status.engineLoading')}</>)}
            {status === 'ready' && (<><Icon.check size={14} style={{ color: 'var(--color-success)' }} /> {t('status.engineReady')}</>)}
            {status === 'error' && (<><Icon.alert size={14} style={{ color: 'var(--color-error)' }} /> {t('status.engineError')}</>)}
          </span>
          <button
            type="button"
            className={`icon-btn ${dark ? 'icon-btn--active' : ''}`}
            onClick={() => setDark((v) => !v)}
            aria-label={t('actions.toggleTheme')}
            title={t('actions.toggleTheme')}
          >
            {dark ? <Icon.sun size={18} /> : <Icon.moon size={18} />}
          </button>
          <LanguageMenu />
        </div>
      </header>

      <main className="app-main">
        <section className="hero">
          <h1>{t('app.name')}</h1>
          <p>{t('app.intro')}</p>
          <div className="hero__links">
            <span className="hero__links-label">{t('app.resources')}</span>
            {RESOURCE_LINKS.map((r) => (
              <a
                key={r.url}
                className="hero__link"
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="hero__link-lang">{r.lang}</span>
                {r.label}
              </a>
            ))}
          </div>
          <div className="hero__rule" />
        </section>

        {/* Transport */}
        <div className="card parchment">
          <div className="card-body" style={{ padding: 'var(--space-4)' }}>
            <div className="transport">
              {source !== 'mic' ? (
                <button type="button" className="btn btn-primary btn-md" onClick={startMic} disabled={status !== 'ready'}>
                  <Icon.mic size={16} style={{ marginRight: 6 }} /> {t('actions.startMic')}
                </button>
              ) : (
                <button type="button" className="btn btn-stamp btn-md" onClick={stop}>
                  <Icon.square size={16} style={{ marginRight: 6 }} /> {t('actions.stopMic')}
                </button>
              )}

              <div className="file-drop" style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)' }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f) }}
              >
                <Icon.fileAudio size={18} />
                <span className={dragging ? 'file-drop--active' : ''}>
                  {source === 'file' ? (
                    <><Icon.activity size={13} style={{ verticalAlign: '-2px' }} /> {' '}{t('status.filePlaying')} · {fileInfo?.name}</>
                  ) : (
                    <>{t('actions.dropHint')} <label style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>{t('actions.browse')}
                      <input type="file" accept="audio/*" onChange={onFileInput} style={{ display: 'none' }} /></label>
                    <span className="text-caption text-muted" style={{ marginLeft: 8 }}>{t('actions.fileTypes')}</span></>
                  )}
                </span>
              </div>

              {source && (
                <span className="status-line">
                  {source === 'mic' ? (<><span className="rec-dot" /> {t('status.micLive')}</>) : t('status.filePlaying')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid-panels">
          {/* Left: spectrum + metrics + history */}
          <div className="stack">
            <div className="card elevated">
              <div className="card-header">
                <div className="row-between">
                  <div>
                    <h2 className="section-title"><Icon.spectrum size={18} /> {t('spectrum.title')}</h2>
                    <p className="section-subtitle">{t('spectrum.subtitle')}</p>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setFullscreen(true)}
                    aria-label={t('actions.fullscreen')}
                    title={t('actions.fullscreen')}
                  >
                    <Icon.maximize size={16} />
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ padding: 'var(--space-4)' }}>
                <Spectrogram
                  analyser={engineRef.current?.analyserNode ?? null}
                  active={active && !fullscreen}
                  history={history}
                  overlays={overlays}
                  onToggleOverlay={toggleOverlay}
                />
              </div>
            </div>

            <div className="card elevated">
              <div className="card-header">
                <h2 className="section-title"><Icon.gauge size={18} /> {t('metrics.pitch')} / {t('metrics.formant')} / {t('metrics.intensity')}</h2>
              </div>
              <div className="card-body" style={{ padding: 'var(--space-4)' }}>
                <MetricsPanel snap={snap} targets={targets} />
              </div>
            </div>

            <div className="card elevated">
              <div className="card-header">
                <h2 className="section-title"><Icon.trend size={18} /> {t('history.title')}</h2>
                <p className="section-subtitle">{t('history.subtitle')}</p>
              </div>
              <div className="card-body" style={{ padding: 'var(--space-4)' }}>
                <PitchHistory history={history} targets={targets} />
                {fileAnalysis && (
                  <div className="metric-grid" style={{ marginTop: 'var(--space-3)' }}>
                    <div className="metric"><div className="metric__label">{t('file.duration')}</div><div className="metric__value">{fileAnalysis.duration}s</div></div>
                    <div className="metric"><div className="metric__label">{t('file.meanPitch')}</div><div className="metric__value">{Number.isFinite(fileAnalysis.meanPitch) ? fileAnalysis.meanPitch : '—'}</div></div>
                    <div className="metric"><div className="metric__label">{t('file.meanF1')}</div><div className="metric__value">{fileAnalysis.meanF1}</div></div>
                    <div className="metric"><div className="metric__label">{t('file.voicedRatio')}</div><div className="metric__value">{(fileAnalysis.voicedRatio * 100).toFixed(0)}%</div></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: targets + practice */}
          <div className="stack">
            <TargetPanel targets={targets} onChange={setTargets} />
            <PracticePanel snap={snap} targets={targets} score={score} />
          </div>
        </div>
      </main>

      {fullscreen && (
        <div className="fullscreen-stage" role="dialog" aria-modal="true" aria-label={t('actions.fullscreen')}>
          <div className="fullscreen-stage__bar">
            <div className="fullscreen-stage__brand">
              <span className="brand-logo" aria-hidden="true" />
              <span className="brand-name">{t('app.name')}</span>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setFullscreen(false)}
              aria-label={t('actions.exitFullscreen')}
              title={t('actions.exitFullscreen')}
            >
              <Icon.x size={18} />
            </button>
          </div>

          <div className="fullscreen-stage__controls">
            <div className="transport">
              {source !== 'mic' ? (
                <button type="button" className="btn btn-primary btn-md" onClick={startMic} disabled={status !== 'ready'}>
                  <Icon.mic size={16} style={{ marginRight: 6 }} /> {t('actions.startMic')}
                </button>
              ) : (
                <button type="button" className="btn btn-stamp btn-md" onClick={stop}>
                  <Icon.square size={16} style={{ marginRight: 6 }} /> {t('actions.stopMic')}
                </button>
              )}

              <div className="file-drop" style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)' }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f) }}
              >
                <Icon.fileAudio size={18} />
                <span className={dragging ? 'file-drop--active' : ''}>
                  {source === 'file' ? (
                    <><Icon.activity size={13} style={{ verticalAlign: '-2px' }} /> {' '}{t('status.filePlaying')} · {fileInfo?.name}</>
                  ) : (
                    <>{t('actions.dropHint')} <label style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>{t('actions.browse')}
                      <input type="file" accept="audio/*" onChange={onFileInput} style={{ display: 'none' }} /></label>
                    <span className="text-caption text-muted" style={{ marginLeft: 8 }}>{t('actions.fileTypes')}</span></>
                  )}
                </span>
              </div>

              {source && (
                <span className="status-line">
                  {source === 'mic' ? (<><span className="rec-dot" /> {t('status.micLive')}</>) : t('status.filePlaying')}
                </span>
              )}
            </div>
          </div>

          <Spectrogram
            className="spectrum-wrap--fill"
            analyser={engineRef.current?.analyserNode ?? null}
            active={active}
            history={history}
            overlays={overlays}
            onToggleOverlay={toggleOverlay}
          />

          <MetricsPanel snap={snap} targets={targets} />

          <div className="fullscreen-stage__history">
            <PitchHistory history={history} targets={targets} />
          </div>
        </div>
      )}
    </>
  )
}
