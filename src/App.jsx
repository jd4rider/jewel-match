import { useCallback, useEffect, useRef, useState } from 'react'
import Gem from './Gem.jsx'
import { sfx } from './sound.js'
import {
  SIZE,
  makeBoard,
  swapCells,
  findStep,
  applyStep,
  findMove,
  shuffleBoard,
  scoreFor,
  levelTarget,
  levelMoves,
} from './game.js'
import './App.css'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1
const BEST_KEY = 'jewel-match-best'

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

export default function App() {
  const [started, setStarted] = useState(false)
  const [level, setLevel] = useState(1)
  const [board, setBoard] = useState(makeBoard)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [moves, setMoves] = useState(levelMoves(1))
  const [selected, setSelected] = useState(null)
  const [clearing, setClearing] = useState(() => new Set())
  const [hint, setHint] = useState(null)
  const [toast, setToast] = useState('')
  const [phase, setPhase] = useState('play') // play | won | lost
  const [muted, setMuted] = useState(false)
  const [best, setBest] = useState(loadBest)

  const busy = useRef(false)
  const boardRef = useRef(board)
  const drag = useRef(null)
  const idle = useRef(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const play = useCallback((name, ...args) => !mutedRef.current && sfx[name](...args), [])

  const target = levelTarget(level)

  const show = (next) => {
    boardRef.current = next
    setBoard(next)
  }

  const flash = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1100)
  }

  // Offer a hint after the player has been idle for a while.
  useEffect(() => {
    clearTimeout(idle.current)
    setHint(null)
    if (!started || phase !== 'play') return
    idle.current = setTimeout(() => setHint(findMove(boardRef.current)), 6000)
    return () => clearTimeout(idle.current)
  }, [board, started, phase])

  const startLevel = (lvl, keepTotal) => {
    setLevel(lvl)
    setScore(0)
    setMoves(levelMoves(lvl))
    if (!keepTotal) setTotal(0)
    setSelected(null)
    setPhase('play')
    show(makeBoard())
  }

  const finish = (nextTotal) => {
    if (nextTotal > best) {
      setBest(nextTotal)
      try {
        localStorage.setItem(BEST_KEY, String(nextTotal))
      } catch {
        // storage unavailable (private mode) — best score just won't persist
      }
    }
  }

  const attemptSwap = async (a, b) => {
    if (busy.current || phase !== 'play') return
    busy.current = true
    setSelected(null)
    setHint(null)

    let current = swapCells(boardRef.current, a, b)
    play('swap')
    show(current)
    await sleep(230)

    let step = findStep(current, [a, b])
    if (!step) {
      play('bad')
      show(swapCells(current, a, b))
      await sleep(230)
      busy.current = false
      return
    }

    const movesLeft = moves - 1
    setMoves(movesLeft)
    let gained = 0
    let combo = 1

    while (step) {
      const special = step.creations.length > 0 || [...step.clear].length > 5
      setClearing(step.clear)
      play(special ? 'special' : 'match', combo)
      if (combo > 1) flash(`Combo x${combo}!`)
      gained += scoreFor(step.clear.size, combo)
      setScore(score + gained)
      await sleep(300)
      current = applyStep(current, step)
      setClearing(new Set())
      show(current)
      await sleep(420)
      combo++
      step = findStep(current)
    }

    const nextScore = score + gained
    if (nextScore >= target) {
      const bonus = movesLeft * 50
      const nextTotal = total + nextScore + bonus
      setTotal(nextTotal)
      setScore(nextScore + bonus)
      finish(nextTotal)
      play('win')
      setPhase('won')
    } else if (movesLeft <= 0) {
      const nextTotal = total + nextScore
      setTotal(nextTotal)
      finish(nextTotal)
      play('lose')
      setPhase('lost')
    } else if (!findMove(current)) {
      flash('No moves — shuffling!')
      await sleep(600)
      show(shuffleBoard(current))
    }
    busy.current = false
  }

  const onCellClick = (r, c) => {
    if (busy.current || phase !== 'play') return
    if (selected && adjacent(selected, [r, c])) attemptSwap(selected, [r, c])
    else if (selected && selected[0] === r && selected[1] === c) setSelected(null)
    else {
      play('select')
      setSelected([r, c])
    }
  }

  const onPointerDown = (e, r, c) => {
    drag.current = { r, c, x: e.clientX, y: e.clientY, fired: false }
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || d.fired || busy.current || phase !== 'play') return
    const cell = e.currentTarget.getBoundingClientRect().width / SIZE
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * 0.4) return
    d.fired = true
    const to = Math.abs(dx) > Math.abs(dy) ? [d.r, d.c + Math.sign(dx)] : [d.r + Math.sign(dy), d.c]
    if (to[0] >= 0 && to[1] >= 0 && to[0] < SIZE && to[1] < SIZE) attemptSwap([d.r, d.c], to)
  }

  const onPointerUp = (r, c) => {
    const d = drag.current
    drag.current = null
    if (d && !d.fired && d.r === r && d.c === c) onCellClick(r, c)
  }

  const hintKeys = new Set((hint || []).map(([r, c]) => `${r},${c}`))
  const pct = Math.min(100, (score / target) * 100)

  if (!started) {
    return (
      <main className="app title-screen">
        <div className="logo-gems">
          {[0, 1, 2, 3, 4, 5].map((t) => (
            <div key={t} className="logo-gem" style={{ animationDelay: `${t * 0.15}s` }}>
              <Gem type={t} />
            </div>
          ))}
        </div>
        <h1>Jewel Match</h1>
        <p className="tag">Swap neighbouring gems to match three or more. Match four for a Blast Gem, five for a Rainbow Gem.</p>
        <button className="btn primary big" onClick={() => setStarted(true)}>Play</button>
        {best > 0 && <p className="best">Best run: {best.toLocaleString()}</p>}
      </main>
    )
  }

  return (
    <main className="app">
      <header className="hud">
        <div className="stat"><span>Level</span><b>{level}</b></div>
        <div className="stat wide">
          <span>Score {score.toLocaleString()} / {target.toLocaleString()}</span>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="stat"><span>Moves</span><b className={moves <= 5 ? 'low' : ''}>{moves}</b></div>
      </header>

      <div className="board-wrap">
        <div
          className="board"
          onPointerMove={onPointerMove}
          onPointerLeave={() => (drag.current = null)}
          style={{ '--size': SIZE }}
        >
          {board.map((row, r) =>
            row.map((gem, c) => {
              const k = `${r},${c}`
              const cls = [
                'cell',
                selected && selected[0] === r && selected[1] === c ? 'selected' : '',
                clearing.has(k) ? 'clearing' : '',
                hintKeys.has(k) ? 'hint' : '',
              ].join(' ')
              return (
                <div
                  key={gem.id}
                  className={cls}
                  style={{ top: `${(r / SIZE) * 100}%`, left: `${(c / SIZE) * 100}%`, '--drop': gem.drop }}
                  onPointerDown={(e) => onPointerDown(e, r, c)}
                  onPointerUp={() => onPointerUp(r, c)}
                >
                  <div className={`gem-inner ${gem.drop ? 'dropping' : ''}`}>
                    <Gem type={gem.type} special={gem.special} />
                  </div>
                </div>
              )
            }),
          )}
        </div>
        {toast && <div className="toast">{toast}</div>}

        {phase !== 'play' && (
          <div className="overlay">
            <div className="card">
              {phase === 'won' ? (
                <>
                  <h2>Level {level} complete!</h2>
                  <p>Score {score.toLocaleString()} · Total {total.toLocaleString()}</p>
                  <button className="btn primary" onClick={() => startLevel(level + 1, true)}>Next level</button>
                </>
              ) : (
                <>
                  <h2>Out of moves</h2>
                  <p>Final total {total.toLocaleString()} · Best {best.toLocaleString()}</p>
                  <button className="btn primary" onClick={() => startLevel(1, false)}>Try again</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="controls">
        <button className="btn" onClick={() => !busy.current && setHint(findMove(boardRef.current))}>Hint</button>
        <button className="btn" onClick={() => !busy.current && startLevel(1, false)}>Restart</button>
        <button className="btn" onClick={() => setMuted((m) => !m)}>{muted ? 'Sound off' : 'Sound on'}</button>
        <span className="best">Best {best.toLocaleString()}</span>
      </footer>
    </main>
  )
}
