import { useEffect, useMemo, useState } from 'react'
import { TreeView } from './TreeView'
import { computeStats, parseText, shannonFano, showChar, uniformCodes, type TreeNode } from './shannonFano'

const DEFAULT_TEXT = 'abracadabra'

const group = (symbols: { char: string }[]) => `{ ${symbols.map((s) => showChar(s.char)).join(' ')} }`

/** Code prefix of a symbol known after `applied` steps. */
function knownPrefix(root: TreeNode, char: string, applied: number) {
  let node = root
  while (node.left && node.right && (node.step ?? Infinity) < applied) {
    node = node.left.symbols.some((s) => s.char === char) ? node.left : node.right
  }
  return { code: node.code, done: node.symbols.length === 1 }
}

export default function App() {
  const [input, setInput] = useState(DEFAULT_TEXT)
  const [applied, setApplied] = useState(0)
  const [playing, setPlaying] = useState(false)

  const parsed = useMemo(() => parseText(input), [input])
  const result = useMemo(() => (parsed.symbols ? shannonFano(parsed.symbols) : null), [parsed])
  const stats = useMemo(
    () => (parsed.symbols && result ? computeStats(parsed.symbols, result.codes) : null),
    [parsed, result],
  )
  const uniform = useMemo(() => (result ? uniformCodes(result.root.symbols) : null), [result])

  const stepCount = result?.steps.length ?? 0

  const changeInput = (value: string) => {
    setInput(value)
    setApplied(0)
    setPlaying(false)
  }

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setApplied((a) => {
        if (a >= stepCount) {
          setPlaying(false)
          return a
        }
        return a + 1
      })
    }, 1100)
    return () => clearInterval(id)
  }, [playing, stepCount])

  const play = () => {
    if (applied >= stepCount) setApplied(0)
    setPlaying(true)
  }

  const currentStep = result && applied > 0 ? result.steps[applied - 1] : null
  const finished = applied >= stepCount && stepCount > 0

  return (
    <main>
      <header>
        <h1>Кодування Шеннона-Фано</h1>
        <p className="lead">
          Символи сортуються за спаданням частоти, потім групу ділять на дві з найближчими сумами. Верхній
          групі додається <b>0</b>, нижній — <b>1</b>, і так до окремих символів.
        </p>
      </header>

      <section className="panel">
        <label className="field">
          <span>Текст для кодування</span>
          <textarea rows={3} value={input} onChange={(e) => changeInput(e.target.value)} spellCheck={false} />
        </label>
        {parsed.error && <p className="error">{parsed.error}</p>}
      </section>

      {result && stats && uniform && (
        <>
          <section className="panel">
            <div className="controls">
              <button onClick={() => setApplied(0)} disabled={applied === 0}>
                ⏮ Спочатку
              </button>
              <button onClick={() => setApplied((a) => Math.max(0, a - 1))} disabled={applied === 0}>
                ◀ Назад
              </button>
              {playing ? (
                <button className="primary" onClick={() => setPlaying(false)}>
                  ⏸ Пауза
                </button>
              ) : (
                <button className="primary" onClick={play}>
                  ▶ Грати
                </button>
              )}
              <button onClick={() => setApplied((a) => Math.min(stepCount, a + 1))} disabled={finished}>
                Далі ▶
              </button>
              <span className="counter">
                Крок {applied} / {stepCount}
              </span>
            </div>
            <input
              className="slider"
              type="range"
              min={0}
              max={stepCount}
              value={applied}
              onChange={(e) => {
                setPlaying(false)
                setApplied(Number(e.target.value))
              }}
              aria-label="Крок алгоритму"
            />

            <p className="explain" aria-live="polite">
              {currentStep ? (
                <>
                  Ділимо групу <b>{group(currentStep.symbols)}</b> (Σ = {currentStep.sum}) на{' '}
                  <b>{group(currentStep.left!.symbols)}</b> (Σ = {currentStep.left!.sum}, додаємо 0) та{' '}
                  <b>{group(currentStep.right!.symbols)}</b> (Σ = {currentStep.right!.sum}, додаємо 1). Різниця
                  сум: {Math.abs(currentStep.left!.sum - currentStep.right!.sum)}.
                </>
              ) : (
                <>
                  Символи впорядковано за частотою: <b>{group(result.root.symbols)}</b>, Σ = {result.root.sum}.
                  Натисніть «Далі», щоб виконати перший поділ.
                </>
              )}
            </p>

            <TreeView root={result.root} applied={applied} />
          </section>

          <section className="panel">
            <h2>Коди: рівномірний і Шеннон-Фано</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Символ</th>
                    <th>Частота</th>
                    <th>Рівномірний код</th>
                    <th>Код Шеннона-Фано</th>
                    <th>Біт усього: рівн. → Ш-Ф</th>
                  </tr>
                </thead>
                <tbody>
                  {result.root.symbols.map((s) => {
                    const { code, done } = knownPrefix(result.root, s.char, applied)
                    const fixedTotal = s.freq * stats.fixedPerSymbol
                    const sfTotal = s.freq * code.length
                    const diff = done ? fixedTotal - sfTotal : 0
                    return (
                      <tr key={s.char}>
                        <td className="mono">{showChar(s.char)}</td>
                        <td>{s.freq}</td>
                        <td className="mono">{uniform.get(s.char)}</td>
                        <td className={`mono ${done ? 'code-done' : 'code-partial'}`}>
                          {code || '—'}
                          {!done && code !== '' && '…'}
                        </td>
                        <td className="mono">
                          {fixedTotal}
                          {done && (
                            <>
                              {' → '}
                              {sfTotal}{' '}
                              <span className={diff > 0 ? 'gain' : diff < 0 ? 'loss' : 'muted'}>
                                ({diff > 0 ? '−' : diff < 0 ? '+' : '±'}
                                {Math.abs(diff)})
                              </span>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {finished && (
                  <tfoot>
                    <tr>
                      <th>Разом</th>
                      <th>{stats.total}</th>
                      <th className="mono">{stats.fixedPerSymbol} біт/символ</th>
                      <th className="mono">L = {stats.avgLength.toFixed(3)}</th>
                      <th className="mono">
                        {stats.fixedBits} → {stats.codedBits}
                      </th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Порівняння з рівномірним кодом</h2>
            {finished ? (
              <Comparison
                fixedPerSymbol={stats.fixedPerSymbol}
                fixedBits={stats.fixedBits}
                avgLength={stats.avgLength}
                codedBits={stats.codedBits}
                entropy={stats.entropy}
                efficiency={stats.efficiency}
                ratio={stats.ratio}
                distinct={result.root.symbols.length}
              />
            ) : (
              <p className="muted">Порівняння з’явиться, коли всі коди будуть побудовані.</p>
            )}
          </section>

          {finished && (
            <section className="panel">
              <h2>Закодований рядок</h2>
              <div className="encoded">
                <h3>
                  Рівномірний код <span className="muted">— {stats.fixedBits} біт</span>
                </h3>
                <p className="bits mono">
                  {[...input].map((ch, i) => (
                    <span key={i} className={i % 2 ? 'alt' : ''} title={showChar(ch)}>
                      {uniform.get(ch)}
                    </span>
                  ))}
                </p>
                <h3>
                  Шеннон-Фано <span className="muted">— {stats.codedBits} біт</span>
                </h3>
                <p className="bits mono">
                  {[...input].map((ch, i) => (
                    <span key={i} className={i % 2 ? 'alt' : ''} title={showChar(ch)}>
                      {result.codes.get(ch)}
                    </span>
                  ))}
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

type ComparisonProps = {
  fixedPerSymbol: number
  fixedBits: number
  avgLength: number
  codedBits: number
  entropy: number
  efficiency: number
  ratio: number
  distinct: number
}

function Comparison(p: ComparisonProps) {
  const saved = p.fixedBits - p.codedBits
  const savedPct = (saved / p.fixedBits) * 100
  const rows = [
    { label: 'Рівномірний код', value: p.fixedPerSymbol, cls: 'bar-fixed' },
    { label: 'Шеннон-Фано', value: p.avgLength, cls: 'bar-sf' },
    { label: 'Ентропія H (межа)', value: p.entropy, cls: 'bar-h' },
  ]
  const max = Math.max(...rows.map((r) => r.value))

  return (
    <div className="comparison">
      <div className="bars" role="img" aria-label="Середня кількість біт на символ">
        {rows.map((r) => (
          <div key={r.label} className="bar-row">
            <span className="bar-label">{r.label}</span>
            <div className="bar-track">
              <div className={`bar ${r.cls}`} style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
            <span className="bar-value mono">{r.value.toFixed(3)} біт/симв.</span>
          </div>
        ))}
      </div>

      <div className="cards">
        <div className="card">
          <span className="card-label">{saved >= 0 ? 'Економія' : 'Перевитрата'}</span>
          <span className={`card-value ${saved >= 0 ? 'gain' : 'loss'}`}>
            {Math.abs(saved)} біт ({Math.abs(savedPct).toFixed(1)}%)
          </span>
        </div>
        <div className="card">
          <span className="card-label">Коефіцієнт стиснення</span>
          <span className="card-value">{p.ratio.toFixed(2)}×</span>
        </div>
        <div className="card">
          <span className="card-label">Ефективність H / L</span>
          <span className="card-value">{(p.efficiency * 100).toFixed(1)}%</span>
        </div>
        <div className="card">
          <span className="card-label">Ефективність рівномірного H / k</span>
          <span className="card-value">{((p.entropy / p.fixedPerSymbol) * 100).toFixed(1)}%</span>
        </div>
      </div>

      <p className="muted note">
        Рівномірний код: {p.distinct} різних символів → k = ⌈log₂ {p.distinct}⌉ = {p.fixedPerSymbol} біт на кожен
        символ незалежно від частоти. Шеннон-Фано дає частим символам коротші коди, тому середня довжина L
        ближча до ентропії H — теоретичної межі стиснення.
      </p>
    </div>
  )
}
