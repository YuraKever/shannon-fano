export type Sym = { char: string; freq: number }

export type TreeNode = {
  id: number
  symbols: Sym[]
  sum: number
  code: string
  left?: TreeNode
  right?: TreeNode
  /** Index of the step in which this node was split (internal nodes only). */
  step?: number
  /** Index of the first symbol of the right group inside `symbols`. */
  splitAt?: number
  parent?: TreeNode
}

export type Result = {
  root: TreeNode
  steps: TreeNode[]
  codes: Map<string, string>
}

const sum = (symbols: Sym[]) => symbols.reduce((s, x) => s + x.freq, 0)

/** Index where the list is split so that the two sums are as close as possible. */
function findSplit(symbols: Sym[]): number {
  const total = sum(symbols)
  let acc = 0
  let best = 1
  let bestDiff = Infinity
  for (let i = 1; i < symbols.length; i++) {
    acc += symbols[i - 1].freq
    const diff = Math.abs(total - 2 * acc)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  }
  return best
}

export function shannonFano(input: Sym[]): Result {
  const symbols = [...input].sort((a, b) => b.freq - a.freq || a.char.localeCompare(b.char))
  let nextId = 0
  const makeNode = (syms: Sym[], code: string, parent?: TreeNode): TreeNode => ({
    id: nextId++,
    symbols: syms,
    sum: sum(syms),
    code,
    parent,
  })

  const root = makeNode(symbols, '')
  const steps: TreeNode[] = []
  const codes = new Map<string, string>()

  // Breadth-first so the tree grows level by level.
  const queue: TreeNode[] = [root]
  while (queue.length) {
    const node = queue.shift()!
    if (node.symbols.length === 1) {
      codes.set(node.symbols[0].char, node.code || '0')
      continue
    }
    const at = findSplit(node.symbols)
    node.splitAt = at
    node.step = steps.length
    node.left = makeNode(node.symbols.slice(0, at), node.code + '0', node)
    node.right = makeNode(node.symbols.slice(at), node.code + '1', node)
    steps.push(node)
    queue.push(node.left, node.right)
  }

  return { root, steps, codes }
}

export type Stats = {
  total: number
  codedBits: number
  fixedBits: number
  fixedPerSymbol: number
  avgLength: number
  entropy: number
  efficiency: number
  ratio: number
}

/** Bits per symbol of a uniform (fixed-length) code for `count` distinct symbols. */
export const fixedLength = (count: number) => Math.max(1, Math.ceil(Math.log2(count)))

/** Uniform code: the symbol's index in `symbols`, written in binary with a fixed width. */
export function uniformCodes(symbols: Sym[]): Map<string, string> {
  const width = fixedLength(symbols.length)
  return new Map(symbols.map((s, i) => [s.char, i.toString(2).padStart(width, '0')]))
}

export function computeStats(symbols: Sym[], codes: Map<string, string>): Stats {
  const total = sum(symbols)
  const codedBits = symbols.reduce((s, x) => s + x.freq * (codes.get(x.char)?.length ?? 0), 0)
  const fixedPerSymbol = fixedLength(symbols.length)
  const fixedBits = total * fixedPerSymbol
  const entropy = -symbols.reduce((s, x) => s + (x.freq / total) * Math.log2(x.freq / total), 0)
  const avgLength = codedBits / total
  return {
    total,
    codedBits,
    fixedBits,
    fixedPerSymbol,
    avgLength,
    entropy,
    efficiency: entropy / avgLength,
    ratio: fixedBits / codedBits,
  }
}

export type ParseResult = { symbols: Sym[]; error?: undefined } | { symbols?: undefined; error: string }

/** "hello world" → symbols counted from the string */
export function parseText(text: string): ParseResult {
  const counts = new Map<string, number>()
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  const symbols = [...counts].map(([char, freq]) => ({ char, freq }))
  if (symbols.length < 2) return { error: 'У рядку мають бути щонайменше 2 різні символи' }
  return { symbols }
}

export const showChar = (c: string) => (c === ' ' ? '␣' : c)
