const KEY = 'jewel-match-save-v2'

const defaults = () => ({
  journey: { unlocked: 1, stars: {} },
  inv: { hammer: 3, bomb: 2, zap: 2, shuffle: 2, extra: 2 },
  best: { classic: 0, timed: 0, zen: 0 },
  muted: false,
})

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    const d = defaults()
    return { ...d, ...raw, journey: { ...d.journey, ...raw?.journey }, inv: { ...d.inv, ...raw?.inv }, best: { ...d.best, ...raw?.best } }
  } catch {
    return defaults()
  }
}

export const data = load()

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage unavailable (private mode) — progress just won't persist
  }
}
