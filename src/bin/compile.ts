#!/usr/bin/ts-node
import { CallExpression, Node, Project, ts } from 'ts-morph'
import path from 'path'

let project = new Project({ tsConfigFilePath: 'tsconfig.json' })

let program = project.getProgram()
let tc = project.getTypeChecker()

// First: find all macro definitions

console.log(project.getSourceFiles().map((f) => f.getFilePath()))
console.log('loading macro file. path:', macroPath)

let macroFile = project.getSourceFile(macroPath)!
let macroFn = macroFile.getFunction('Macro')!
console.log(macroFn.print())

let macroDefs = macroFn.findReferencesAsNodes()
console.log('macro defs:', macroDefs.length)
macroDefs.forEach((def) => {
  console.log('found macro def', def.print())

  let callExp = getFirstParentOfKind(def, ts.SyntaxKind.CallExpression)

  if (callExp && ts.isCallExpression(callExp.compilerNode)) {
    let declExp = getFirstParentOfKind(
      callExp,
      ts.SyntaxKind.VariableDeclaration
    )
    if (declExp && ts.isVariableDeclaration(declExp.compilerNode)) {
      let definedMacroIdentifier = declExp.getChildAtIndexIfKind(
        0,
        ts.SyntaxKind.Identifier
      )
      if (definedMacroIdentifier) {
        let mfn = require(def.getSourceFile().getFilePath())[
          definedMacroIdentifier.getText()
        ]

        let macroRefs = definedMacroIdentifier
          .findReferencesAsNodes()
          .map((n) => {
            let parent = n.getParentIfKind(ts.SyntaxKind.CallExpression)
            if (parent) {
              return parent
            }
          })
          .filter((c) => c) as CallExpression[]
        macroRefs.forEach((ref) => {
          let node = mfn({ ts, callExpression: ref })
          ref.transform(() => node)
        })
      }
    }
  }
})

function getFirstParentOfKind(
  node: Node<ts.Node>,
  kind: ts.SyntaxKind
): Node<ts.Node> | undefined {
  let p = node.getParent()
  while (p) {
    if (p.getKind() === kind) {
      return p
    }
    p = p.getParent()
  }
}

project.emit()
