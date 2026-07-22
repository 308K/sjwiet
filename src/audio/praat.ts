/**
 * PraatBridge — thin async wrapper around praat-wasm.
 *
 * The WASM module is loaded lazily (the binary is served from /praat.wasm)
 * and every analysis runs against WAV-encoded PCM built in memory, so both
 * live microphone windows and decoded files share one code path.
 */

import { createPraatWasm } from 'praat-wasm'

export interface AcousticFrame {
  /** f0 in Hz; NaN when the window is unvoiced */
  pitch: number
  /** Formant center frequencies in Hz; NaN when unavailable */
  f1: number
  f2: number
  f3: number
  /** RMS intensity in dB */
  intensity: number
  /** true when praat reports a voiced frame at window centre */
  voiced: boolean
}

export interface FileAnalysis {
  duration: number
  meanPitch: number
  meanF1: number
  meanF2: number
  meanIntensity: number
  /** share of frames that are voiced, 0–1 */
  voicedRatio: number
}

type PraatInstance = Awaited<ReturnType<typeof createPraatWasm>>

let praatPromise: Promise<PraatInstance> | null = null

/** Lazily create the singleton praat instance. */
export function loadPraat(): Promise<PraatInstance> {
  if (!praatPromise) {
    praatPromise = createPraatWasm('/praat.wasm')
  }
  return praatPromise
}

/** Encode mono float PCM as 16-bit PCM WAV bytes for praat.readAudio(). */
export function encodeWavPcm16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const n = samples.length
  const dataBytes = n * 2
  const buffer = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buffer)

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, dataBytes, true)

  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

const Q = (n: number, digits = 1): number => {
  if (!Number.isFinite(n)) return NaN
  const f = 10 ** digits
  return Math.round(n * f) / f
}

/**
 * Analyze a short mono PCM window (typically 0.5–2.5 s) and return the
 * acoustic snapshot at the window's temporal centre.
 */
export async function analyzeWindow(
  praat: PraatInstance,
  pcm: Float32Array,
  sampleRate: number,
): Promise<AcousticFrame> {
  const empty: AcousticFrame = { pitch: NaN, f1: NaN, f2: NaN, f3: NaN, intensity: NaN, voiced: false }
  if (pcm.length < sampleRate * 0.2) return empty

  const wav = encodeWavPcm16(pcm, sampleRate)
  const sound = praat.readAudio(wav, 'window')
  if (!sound) return { pitch: NaN, f1: NaN, f2: NaN, f3: NaN, intensity: NaN, voiced: false }
  try {
    const mid = sound.startTime + sound.totalDuration / 2

    const intensity = sound.toIntensity(75, 0, true)
    const pitch = sound.toPitch(0, 75, 600)
    const formant = sound.toFormantBurg(0, 5, 5500, 0.025, 50)
    try {
      const f0 = pitch.getValueAtTime(mid, 'Hertz', 'Linear')
      const voiced = Number.isFinite(f0) && f0 > 0
      const db = intensity.getValue(mid, 'cubic')
      return {
        pitch: Q(f0),
        f1: Q(formant.getValueAtTime(1, mid, 'hertz')),
        f2: Q(formant.getValueAtTime(2, mid, 'hertz')),
        f3: Q(formant.getValueAtTime(3, mid, 'hertz')),
        intensity: Q(db),
        voiced,
      }
    } finally {
      intensity.remove()
      pitch.remove()
      formant.remove()
    }
  } finally {
    sound.remove()
  }
}

/**
 * Whole-file analysis (offline): computes summary statistics across the
 * entire recording. Used when the user imports an audio file.
 */
export async function analyzeFile(
  praat: PraatInstance,
  pcm: Float32Array,
  sampleRate: number,
): Promise<FileAnalysis> {
  const wav = encodeWavPcm16(pcm, sampleRate)
  const sound = praat.readAudio(wav, 'file')
  if (!sound) {
    return { duration: 0, meanPitch: NaN, meanF1: NaN, meanF2: NaN, meanIntensity: NaN, voicedRatio: 0 }
  }
  try {
    const duration = sound.totalDuration
    const pitch = sound.toPitch(0, 75, 600)
    const formant = sound.toFormantBurg(0, 5, 5500, 0.025, 50)
    const intensity = sound.toIntensity(75, 0, true)
    try {
      const nFrames = pitch.nFrames
      let voiced = 0
      let pitchSum = 0
      for (let i = 1; i <= nFrames; i++) {
        const v = pitch.getValueInFrame(i, 'Hertz')
        if (Number.isFinite(v) && v > 0) {
          voiced++
          pitchSum += v
        }
      }
      const t0 = sound.startTime
      const t1 = sound.endTime
      return {
        duration: Q(duration, 2),
        meanPitch: voiced > 0 ? Q(pitchSum / voiced) : NaN,
        meanF1: Q(formant.getMean(1, t0, t1, 'hertz')),
        meanF2: Q(formant.getMean(2, t0, t1, 'hertz')),
        meanIntensity: Q(intensity.getAverage(t0, t1, 'energy')),
        voicedRatio: nFrames > 0 ? Q(voiced / nFrames, 3) : 0,
      }
    } finally {
      pitch.remove()
      formant.remove()
      intensity.remove()
    }
  } finally {
    sound.remove()
  }
}

/** Mix a multi-channel AudioBuffer down to mono Float32Array. */
export function bufferToMono(buffer: AudioBuffer): Float32Array {
  const ch = buffer.numberOfChannels
  const len = buffer.length
  if (ch === 1) return buffer.getChannelData(0).slice()
  const out = new Float32Array(len)
  for (let c = 0; c < ch; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < len; i++) out[i] += data[i] / ch
  }
  return out
}

/** Naïvely resample mono PCM to the target rate (linear interpolation). */
export function resample(pcm: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return pcm
  const ratio = from / to
  const outLen = Math.round(pcm.length / ratio)
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio
    const i0 = Math.floor(pos)
    const i1 = Math.min(i0 + 1, pcm.length - 1)
    const frac = pos - i0
    out[i] = pcm[i0] * (1 - frac) + pcm[i1] * frac
  }
  return out
}
