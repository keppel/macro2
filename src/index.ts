import { ts, Node } from 'ts-morph'
type MacroFn = (ctx: {
  ts: typeof ts
  callExpression: Node<ts.CallExpression>
}) => void

export function Macro(fn: MacroFn): MacroFn {
  return fn
}
