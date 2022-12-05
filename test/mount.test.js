import { describe, expect, it, beforeEach, vi } from 'vitest'
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
    it('executed javascript updates on data change', () => {
        const data = reactive({ num1: 1, num2: 2 })
        const template = compile(data)`<div>My favorite number is {{ num1 + num2 }}</div>`
        render(template)
        data.num1 = 2
        expect(document.body.textContent).toBe('My favorite number is 4')
    })
    it('event handlers register changes in data they reference', (() => {
        const data = reactive({ num: 0, clickHandler: function() { this.num++ } })
        const template = compile(data)`<button @click="clickHandler">Click me: {{ num }}</button>`
        template.querySelector('button').click()
        expect(template.querySelector('button').textContent).toBe('Click me: 1')
    }))
})
describe('compile', () => {
    it('accepts different delimiters', () => {
        const data = reactive({ string: 'world' })
        const template = compile(data, ['<%=', '%>'])`<div>Hello <%= string %></div>`
        expect(template.textContent).toBe(`Hello world`)
    })
    it('accepts multiple children at root', () => {
        const data = reactive({ string: 'world' })
        const template = compile(data)`<div>Hello {{ string }}</div><div>{{ string }} hello!</div>`
        expect(template.textContent).toBe(`Hello worldworld hello!`)
    })    
    describe('textContent', () => {
        it('interpolates node content with data', () => {
            const data = reactive({ string: 'world' })
            const template = compile(data)`<div>Hello {{ string }}</div>`
            expect(template.textContent).toBe(`Hello world`)
        })
        it('only interpolates content within matching pair of delimiters', () => {
            const data = reactive({ string: 'world' })
            const template = compile(data)`<div>Hello <span>{{</span> {{ string }}</div>`
            expect(template.textContent).toBe(`Hello {{ world`)
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
        it('parses provided javascript', () => {
            const data = reactive({ num1: 1, num2: 2 })
            const template = compile(data)`<div>My favorite number is {{ num1 + num2 }}!</div>`
            expect(template.textContent).toBe(`My favorite number is 3!`)
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
        it('parses provided javascript', () => {
            const data = reactive({ num1: 1, num2: 2 })
            const template = compile(data)`<div foo="{{ num1 + num2 }}">Hello world!</div>`
            expect(template.querySelector('div').getAttribute('foo')).toBe('3')
        })
        it('adds event listener to element when passed attribute `@[event]`', () => {
            const data = reactive({ clickHandler: vi.fn()})
            const template = compile(data)`<button @click="clickHandler">Click me</button>`
            template.querySelector('button').click()
            expect(data.clickHandler.value).toHaveBeenCalled()
        })
    })
})
