import { ts, Node, TypeChecker, CallExpression } from 'ts-morph'
type MacroFn = (ctx: {
  callExpression: CallExpression<ts.CallExpression>
  typeChecker: TypeChecker
}) => string | undefined

export function Macro<F extends MacroFn>(fn: F): F {
  return fn
}
