/** Shared domain types for the practice studio. */

export interface TargetConfig {
  /** Pitch floor in Hz */
  pitchMin: number
  /** Pitch ceiling in Hz */
  pitchMax: number
  /** F1 target in Hz */
  f1: number
  /** F2 target in Hz */
  f2: number
  /** Acceptable half-width (Hz) around each target */
  tolerance: number
}

export interface AcousticSnapshot {
  pitch: number
  f1: number
  f2: number
  f3: number
  intensity: number
  voiced: boolean
  /** epoch ms */
  t: number
}

/** Which acoustic overlays to draw on the spectrogram. */
export interface SpectrumOverlays {
  pitch: boolean
  f1: boolean
  f2: boolean
  intensity: boolean
}

export type SpectrumOverlayKey = keyof SpectrumOverlays
