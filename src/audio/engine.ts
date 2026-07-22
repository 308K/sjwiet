/**
 * AudioEngine — unified capture layer for the practice studio.
 *
 * Two input sources are supported behind one interface:
 *  - live microphone via getUserMedia
 *  - local audio files decoded through Web Audio
 *
 * Both feed a shared AnalyserNode (for the spectrum view) and a rolling
 * PCM ring buffer (for the praat-wasm acoustic analysis).
 */

export type SourceKind = 'mic' | 'file'

export interface EngineState {
  kind: SourceKind | null
  running: boolean
}

/** Rolling mono PCM buffer consumed by the praat analysis loop. */
export class PcmRing {
  private buf: Float32Array
  private writePos = 0
  private filled = 0
  readonly capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.buf = new Float32Array(capacity)
  }

  push(chunk: Float32Array): void {
    for (let i = 0; i < chunk.length; i++) {
      this.buf[this.writePos] = chunk[i]
      this.writePos = (this.writePos + 1) % this.capacity
      if (this.filled < this.capacity) this.filled++
    }
  }

  /** Copy the most recent `n` samples (oldest → newest) into a new array. */
  tail(n: number): Float32Array {
    const len = Math.min(n, this.filled)
    const out = new Float32Array(len)
    const start = (this.writePos - len + this.capacity) % this.capacity
    for (let i = 0; i < len; i++) {
      out[i] = this.buf[(start + i) % this.capacity]
    }
    return out
  }

  clear(): void {
    this.writePos = 0
    this.filled = 0
  }
}

const FFT_SIZE = 4096
const SCRIPT_BUFFER = 2048

export class AudioEngine {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private sourceNode: AudioNode | null = null
  private processor: ScriptProcessorNode | null = null
  private mediaStream: MediaStream | null = null
  private fileSource: AudioBufferSourceNode | null = null

  /** ~2.5 s of mono PCM kept for analysis windows */
  readonly ring: PcmRing

  state: EngineState = { kind: null, running: false }

  constructor() {
    this.ring = new PcmRing(44100 * 3)
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 44100
  }

  get analyserNode(): AnalyserNode | null {
    return this.analyser
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = FFT_SIZE
      this.analyser.smoothingTimeConstant = 0.55
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** Attach a ScriptProcessor that mirrors incoming PCM into the ring buffer. */
  private attachProcessor(input: AudioNode): void {
    const ctx = this.ensureContext()
    this.processor = ctx.createScriptProcessor(SCRIPT_BUFFER, 1, 1)
    this.processor.onaudioprocess = (ev) => {
      this.ring.push(ev.inputBuffer.getChannelData(0))
    }
    input.connect(this.processor)
    // ScriptProcessor must reach destination to fire; keep it silent.
    const mute = ctx.createGain()
    mute.gain.value = 0
    this.processor.connect(mute)
    mute.connect(ctx.destination)
  }

  async startMic(): Promise<void> {
    this.stop()
    const ctx = this.ensureContext()
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    this.mediaStream = stream
    const src = ctx.createMediaStreamSource(stream)
    this.sourceNode = src
    src.connect(this.analyser!)
    this.attachProcessor(src)
    this.ring.clear()
    this.state = { kind: 'mic', running: true }
  }

  /**
   * Decode a local file, play it through the analyser, and capture PCM.
   * `onEnded` fires when playback finishes naturally.
   */
  async startFile(file: File, onEnded?: () => void): Promise<AudioBuffer> {
    this.stop()
    const ctx = this.ensureContext()
    const raw = await file.arrayBuffer()
    const buffer = await ctx.decodeAudioData(raw)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    this.fileSource = src
    this.sourceNode = src
    src.connect(this.analyser!)
    this.analyser!.connect(ctx.destination)
    this.attachProcessor(src)
    this.ring.clear()
    src.onended = () => {
      if (this.state.kind === 'file') this.stop()
      onEnded?.()
    }
    src.start()
    this.state = { kind: 'file', running: true }
    return buffer
  }

  /** Decode a file without playing it (used for offline full-file analysis). */
  async decodeFile(file: File): Promise<AudioBuffer> {
    const ctx = this.ensureContext()
    const raw = await file.arrayBuffer()
    return ctx.decodeAudioData(raw)
  }

  stop(): void {
    try { this.fileSource?.stop() } catch { /* already stopped */ }
    this.fileSource = null
    this.mediaStream?.getTracks().forEach((t) => t.stop())
    this.mediaStream = null
    this.processor?.disconnect()
    this.processor = null
    this.sourceNode?.disconnect()
    this.sourceNode = null
    if (this.analyser && this.ctx) {
      try { this.analyser.disconnect() } catch { /* noop */ }
    }
    this.state = { kind: null, running: false }
  }

  dispose(): void {
    this.stop()
    if (this.ctx) void this.ctx.close()
    this.ctx = null
    this.analyser = null
  }
}
