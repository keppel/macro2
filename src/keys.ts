import { Macro } from './index'

export const keys = Macro(function ({ ts, callExpression }) {
  let t = callExpression.getChildrenOfKind(ts.SyntaxKind.TypeReference)[0]
  return ts.factory.createArrayLiteralExpression(
    t
      .getType()
      .getProperties()
      .map((p) => p.getName())
      .map((p) => ts.factory.createStringLiteral(p))
  )
}) as <T>() => Array<keyof T>
