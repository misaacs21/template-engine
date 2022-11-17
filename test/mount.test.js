import { describe, expect, it, beforeEach } from 'vitest'
import { compile,  render, reactive } from '@/interface.js'

beforeEach(() => {
    document.body.innerHTML = ''
})

describe('reactive render', () => {
    it('textContent updates on data change', () => {
        const data = reactive({ string: 'world' })
        const template = compile(data)`<div>Hello {{ string }}</div>`
        render(template)
        data.string = 'Dave'
        expect(document.body.textContent).toBe('Hello Dave')
    })
    it('attribute updates on data change', () => {
        const data = reactive({ data: 'bar' })
        const template = compile(data)`<div foo="{{ data }}">Hello world!</div>`
        render(template)
        data.data = 'foo'
        expect(document.body.querySelector('div').getAttribute('foo')).toBe('foo')
    })
    it('multiple attributes update on data change', () => {
        const data = reactive({ data: 'bar' })
        const template = compile(data)`<div foo="{{ data }}" bar="{{ data }}">Hello world!</div>`
        render(template)
        data.data = 'foo'
        expect(document.body.querySelector('div').getAttribute('foo')).toBe('foo')
        expect(document.body.querySelector('div').getAttribute('bar')).toBe('foo')
    })
})
describe('compile', () => {
    it('accepts different delimiters', () => {
        const data = reactive({ string: 'world' })
        const template = compile(data, ['<%=', '%>'])`<div>Hello <%= string %></div>`
        expect(template.textContent).toBe(`Hello world`)
    })    

    describe('textContent', () => {
        it('interpolates node content with data', () => {
            const data = reactive({ string: 'world' })
            const template = compile(data)`<div>Hello {{ string }}</div>`
            expect(template.textContent).toBe(`Hello world`)
        })
        it('interpolates nested element content with data', () => {
            const data = reactive({ string: 'world', string2: 'hello' })
            const template = compile(data)`<div>Hello {{ string }} <p>{{ string2 }} <span>{{ string }}!</span></p></div>`
            expect(template.textContent).toBe(`Hello world hello world!`)
        })
        it('does not alter non-reactive element content', () => {
            const data = reactive({ string: 'world' })
            const template = compile(data)`<div>Hello {{ string }} <p>hello!</p></div>`
            expect(template.textContent).toBe(`Hello world hello!`)
        })
    })
    describe('attributes', () => {
        it('interpolates node attributes with data', () => {
            const data = reactive({ data: 'bar' })
            const template = compile(data)`<div foo="{{ data }}">Hello world!</div>`
            expect(template.querySelector('div').getAttribute('foo')).toBe('bar')
        })
        it('interpolates multiple node attributes with data', () => {
            const data = reactive({ data: 'bar' })
            const template = compile(data)`<div foo="{{ data }}" bar="{{ data }}">Hello world!</div>`
            expect(template.querySelector('div').getAttribute('foo')).toBe('bar')
            expect(template.querySelector('div').getAttribute('bar')).toBe('bar')
        })
        it('does not alter non-reactive node attributes', () => {
            const data = reactive({ data: 'bar' })
            const template = compile(data)`<div bar="foo"><p foo="{{ data }}">Hello world!</p></div>`
            expect(template.querySelector('div').getAttribute('bar')).toBe('foo')
        })
    })
})
