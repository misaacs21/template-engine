import { describe, expect, it } from 'vitest'
import { compile,  render, reactive } from '@/interface.js'

describe('reactive', () => {
    it('recompiles and rerenders on data change', () => {
        const data = reactive({ string: 'world' })
        const template = compile(data)`<div>Hello ${ 'string' }</div>`
        render(template)
        data.string = 'Dave'
        expect(document.body.children[0].textContent).toBe('Hello Dave')
    })
})
describe('compile', () => {
    it('interpolates string with data', () => {
        const data = { string: 'world' }
        const template = compile(data)`<div>Hello ${ 'string' }</div>`
        expect(template).toBe(`<div>Hello world</div>`)
    })
})

describe('render', () => {
    it('renders html to DOM', () => {
        render(`<div>Hello world</div>`)
        expect(document.body.children[0].textContent).toBe('Hello world')
    })
})

