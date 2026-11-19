import { useMemo } from 'react'
import { showChar, type TreeNode } from './shannonFano'

const DX = 104
const DY = 104
const NODE_W = 88
const NODE_H = 46
const PAD = 24

type Placed = { node: TreeNode; x: number; y: number }

function layout(root: TreeNode) {
  const placed = new Map<number, Placed>()
  let leafIndex = 0
  let maxDepth = 0
  const walk = (node: TreeNode, depth: number): number => {
    maxDepth = Math.max(maxDepth, depth)
    let x: number
    if (!node.left || !node.right) {
      x = leafIndex++ * DX
    } else {
      const lx = walk(node.left, depth + 1)
      const rx = walk(node.right, depth + 1)
      x = (lx + rx) / 2
    }
    placed.set(node.id, { node, x, y: depth * DY })
    return x
  }
  walk(root, 0)
  return { placed, width: Math.max(1, leafIndex) * DX, height: maxDepth * DY + NODE_H }
}

function label(node: TreeNode) {
  const chars = node.symbols.map((s) => showChar(s.char))
  return chars.length > 4 ? `${chars.slice(0, 3).join(' ')} …` : chars.join(' ')
}

type Props = { root: TreeNode; applied: number }

export function TreeView({ root, applied }: Props) {
  const { placed, width, height } = useMemo(() => layout(root), [root])

  const vbW = width - DX + NODE_W + PAD * 2
  const vbH = height + PAD * 2
  const all = [...placed.values()]
  // A node is shown once the step that created it (its parent's split) has been applied.
  const visible = (n: TreeNode) => !n.parent || (n.parent.step ?? Infinity) < applied
  const current = (n: TreeNode) => n.step === applied - 1
  const justCreated = (n: TreeNode) => n.parent?.step === applied - 1

  return (
    <div className="tree">
      <svg
        width="100%"
        style={{ maxWidth: vbW, aspectRatio: `${vbW} / ${vbH}` }}
        viewBox={`${-NODE_W / 2 - PAD} ${-PAD} ${vbW} ${vbH}`}
        role="img"
        aria-label="Дерево Шеннона-Фано"
      >
        {all.map(({ node, x, y }) =>
          node.parent && visible(node) ? (
            <g key={`e${node.id}`}>
              <line
                className={justCreated(node) ? 'edge edge-new' : 'edge'}
                x1={placed.get(node.parent.id)!.x}
                y1={placed.get(node.parent.id)!.y + NODE_H}
                x2={x}
                y2={y}
              />
              <text
                className="edge-label"
                x={(placed.get(node.parent.id)!.x + x) / 2 + (node.code.endsWith('0') ? -9 : 9)}
                y={(placed.get(node.parent.id)!.y + NODE_H + y) / 2 + 4}
              >
                {node.code.slice(-1)}
              </text>
            </g>
          ) : null,
        )}

        {all.map(({ node, x, y }) => {
          if (!visible(node)) return null
          const isLeaf = node.symbols.length === 1
          const cls = ['node', isLeaf ? 'leaf' : '', current(node) ? 'current' : '', justCreated(node) ? 'new' : '']
            .filter(Boolean)
            .join(' ')
          return (
            <g key={node.id} className={cls} transform={`translate(${x - NODE_W / 2} ${y})`}>
              <rect width={NODE_W} height={NODE_H} rx={10} />
              <text x={NODE_W / 2} y={19} className="node-title">
                {label(node)}
              </text>
              <text x={NODE_W / 2} y={36} className="node-sub">
                {isLeaf ? `${node.sum} → ${node.code}` : `Σ = ${node.sum}`}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
