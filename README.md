# macro2

Macro2 is an experimental TypeScript compiler wrapper that adds function-like macros.

## Installation
```npm i macro2```

## Example usage

Let's say you want to access an interface's keys at runtime, like this:

```typescript
// index.ts
import { keys } from './keys'

interface Thing {
  foo: number
  bar: number
}

let k = keys<Thing>()
console.log(k) // ['foo', 'bar']
// typeof k is ('foo' | 'bar')[]
```

In `keys.ts`, you'd define the macro like this:
```typescript
import { Macro } from 'macro2'

export const keys = Macro(function ({ callExpression }) {
  let typeNames = callExpression
    .getTypeArguments()[0]
    .getType()
    .getProperties()
    .map((p) => p.getName())
  return JSON.stringify(typeNames) as any
}) as <T>() => Array<keyof T>
```

After you run `macro2`, the compiled output in `index.js` will look something like:
```javascript
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let k = ["foo", "bar"];
console.log(k); // ['foo', 'bar']
// typeof k is ('foo' | 'bar')[]
```

A macro definition function is passed to `Macro()` to be evaluated at compile-time, and our `keys()` call expression is replaced with the string this function returns. The macro definition function can access the [ts-morph](https://github.com/dsherret/ts-morph)-wrapped AST node to read call signature information (eg. getting property names from the type argument).


## How it works

`macro2` replaces the `tsc` command you'd typically use, and uses the same `tsconfig.json`.

Before delegating to the TypeScript compiler's usual behavior, `macro2` scans your project for `variable assignments` to `call expressions` referencing its exported `Macro` function, eg:
```typescript
import { Macro } from 'macro2' 
//                    variable assignment
//     |--------------------------------------------------|
//     v                                                  v
export const myMacro = Macro(function() { return '"foo"' })
//           ^     ^   ^                                  ^
//           |-----|   |----------------------------------|
//         identifier             call expression
```

Then `macro2` scans for all `call expressions` referencing a defined macro's `identifier`, and replaces them with the macro's expanded form:

```typescript
import {myMacro} from './my-macro.ts'
//      call expression
//        |-------|
//        v       v
let bar = myMacro()
//        ^     ^
//        |-----|
//       identifier

// compiles to:
let bar = "foo"
```

## Using third-party macros

Currently, you'll have to redefine third-party macros in your project for `macro2` to find them.

For example, to use `macro2-keys`:

```
npm install macro2-keys
```

```typescript
// my-macros.ts
import { Macro } from 'macro2'
import { keys as _keys } from 'macro2-keys'

export const keys: typeof _keys = Macro(_keys as any)
```

```typescript
// app.ts
import { keys } from './my-macros'
let k = keys<{foo: string, bar: string}>() // ['foo', 'bar']

```
