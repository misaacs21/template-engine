import { describe, expect, it } from 'vitest'
import { compile,  render, reactive } from '@/interface.js'

describe('reactive', () => {
    it('recompiles and rerenders on data change', () => {
        const data = reactive({ string: 'world' })
        const template = compile(data)`<div>Hello {{ string }}</div>`
        render(template)
        data.string = 'Dave'
        expect(document.body.children[0].textContent).toBe('Hello Dave')
    })
})
describe('compile', () => {
    it('interpolates string with data', () => {
        const data = reactive({ string: 'world' })
        const template = compile(data)`<div>Hello {{ string }}</div>`
        expect(template.textContent).toBe(`Hello world`)
    })
    it('interpolates nested elements with data', () => {
        const data = reactive({ string: 'world', string2: 'hello' })
        const template = compile(data)`<div>Hello {{ string }} <p>{{ string2 }} <span>{{ string }}!</span></p></div>`
        expect(template.textContent).toBe(`Hello world hello world!`)
    })
    it('does not alter non-reactive elements', () => {
        const data = reactive({ string: 'world' })
        const template = compile(data)`<div>Hello {{ string }} <p>hello!</p></div>`
        expect(template.textContent).toBe(`Hello world hello!`)
    })
    it('accepts different delimiters', () => {
        const data = reactive({ string: 'world' })
        const template = compile(data, ['<%=', '%>'])`<div>Hello <%= string %></div>`
        expect(template.textContent).toBe(`Hello world`)
    })
})
