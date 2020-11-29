import { keys } from './keys'

interface Thing {
  foo: string
  bar: number
  count: number
}

let k = keys<Thing>()
console.log(k)
