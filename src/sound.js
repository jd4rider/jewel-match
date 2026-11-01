let ctx = null

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, { type = 'sine', dur = 0.18, gain = 0.12, delay = 0 } = {}) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const osc = a.createOscillator()
  const amp = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(amp).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
const note = (step) => 523.25 * 2 ** (SCALE[Math.min(step, SCALE.length - 1)] / 12)

export const sfx = {
  select: () => tone(660, { dur: 0.08, gain: 0.06, type: 'triangle' }),
  swap: () => tone(440, { dur: 0.1, gain: 0.06, type: 'triangle' }),
  bad: () => {
    tone(180, { type: 'sawtooth', dur: 0.14, gain: 0.05 })
    tone(140, { type: 'sawtooth', dur: 0.16, gain: 0.05, delay: 0.09 })
  },
  match: (combo) => {
    tone(note(combo - 1), { type: 'triangle', dur: 0.25 })
    tone(note(combo + 1) * 1.5, { dur: 0.3, gain: 0.05, delay: 0.05 })
  },
  special: () => [0, 4, 7, 12].forEach((s, i) => tone(392 * 2 ** (s / 12), { dur: 0.3, delay: i * 0.06 })),
  win: () => [0, 4, 7, 12, 16].forEach((s, i) => tone(523.25 * 2 ** (s / 12), { dur: 0.4, delay: i * 0.1 })),
  lose: () => [7, 3, 0, -5].forEach((s, i) => tone(392 * 2 ** (s / 12), { type: 'triangle', dur: 0.4, delay: i * 0.16 })),
}
