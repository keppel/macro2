#!/usr/bin/env ts-node-script
import {
  createWrappedNode,
  VariableStatement,
  CallExpression,
  Project,
  ts,
  Identifier,
  Node,
} from 'ts-morph'

let project = new Project({ tsConfigFilePath: 'tsconfig.json' })

let typeChecker = project.getTypeChecker()

function getMacroImportIdentifiers() {
  let macroIdents: Array<Identifier> = []
  project.getSourceFiles().forEach((sourceFile) => {
    sourceFile.getImportDeclarations().forEach((importDeclaration) => {
      let modName = importDeclaration.getLastChildIfKind(
        ts.SyntaxKind.StringLiteral
      )
      if (modName && modName.getLiteralText() === 'macro2') {
        // Get Macro identifier
        let macroIdent = importDeclaration.getFirstDescendantByKind(
          ts.SyntaxKind.Identifier
        )
        if (macroIdent) {
          if (macroIdent.getText() === 'Macro') {
            macroIdents.push(macroIdent)
          }
        }
      }
    })
  })
  return macroIdents
}

function getMacroDefinitions(macroIdents: Identifier[]) {
  let macroDefinitions: Array<VariableStatement> = []
  macroIdents.forEach((ident: Identifier) => {
    let refs = ident.findReferencesAsNodes()
    refs.forEach((ref) => {
      let variableStatements = ref.getAncestors().filter((ancestor) => {
        return ancestor.getFirstDescendantByKind(ts.SyntaxKind.ExportKeyword)
      })
      variableStatements.forEach((p) => {
        if (p.getKind() === ts.SyntaxKind.VariableStatement) {
          macroDefinitions.push(p as VariableStatement)
        }
      })
    })
  })
  return macroDefinitions
}

function getIdentifierFromMacroDefinition(
  variableStatement: VariableStatement
) {
  return variableStatement.getFirstDescendantByKindOrThrow(
    ts.SyntaxKind.Identifier
  )
}

function getMacroInvocationsByIdentifier(ident: Identifier): CallExpression[] {
  let invocations: CallExpression[] = []
  let refs = ident.findReferencesAsNodes()
  refs.forEach((ref) => {
    let parent = ref.getParentIfKind(ts.SyntaxKind.CallExpression)
    if (parent) {
      invocations.push(parent)
    }
  })
  return invocations
}

function getFunctionForMacroInvocation(callExpression: CallExpression) {
  let ident = callExpression.getFirstDescendantByKind(ts.SyntaxKind.Identifier)
  if (ident) {
    let defs = ident.getDefinitionNodes()
    let name = ident.getText()
    if (defs.length === 0) {
      throw new Error(`Could not find definition for macro ${name}`)
    } else if (defs.length > 1) {
      throw new Error(`Found too many definitions for macro ${name}`)
    }
    let def = defs[0]
    let src = def.getSourceFile()
    let fn = require(src.getFilePath())[name]
    if (typeof fn === 'function') {
      return fn
    } else {
      throw new Error(`Invalid type for macro ${name} in ${src.getFilePath()}`)
    }
  }
}

function expandMacroCallExpression(
  callExpression: CallExpression,
  macroFn: Function
) {
  let wrappedCallExpression = createWrappedNode(callExpression.compilerNode, {
    typeChecker: typeChecker.compilerObject,
  })

  let node: Node<ts.Node> | string | undefined = macroFn({
    callExpression: wrappedCallExpression,
    ts,
    typeChecker,
  })
  if (typeof node === 'string') {
    callExpression.replaceWithText(node)
  } else if (node) {
    callExpression.transform(() => node as any)
  }
}

let macroIdents = getMacroImportIdentifiers()
let macroDefinitions = getMacroDefinitions(macroIdents)
let macroIdentifiers = macroDefinitions.map(getIdentifierFromMacroDefinition)
let macroInvocations = macroIdentifiers
  .map(getMacroInvocationsByIdentifier)
  .flat()
let macroFns = macroInvocations.map(getFunctionForMacroInvocation)
macroFns.forEach((macroFn, i) => {
  expandMacroCallExpression(macroInvocations[i], macroFn)
})

project.emit()
