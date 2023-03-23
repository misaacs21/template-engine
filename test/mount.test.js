import { describe, expect, it, beforeEach, vi } from 'vitest'
import { compile, render } from '@/interface.js'

beforeEach(() => {
    document.body.innerHTML = ''
})

describe('reactive render', () => {
    it('textContent updates on data change', () => {
        const { template, data } = compile({ string: 'world' })`<div>Hello {{ string }}</div>`
        render(template)
        data.string = 'Dave'
        expect(document.body.textContent).toBe('Hello Dave')
    })
    it('attribute updates on data change', () => {
        const { template, data } = compile({ data: 'bar' })`<div foo="{{ data }}">Hello world!</div>`
        render(template)
        data.data = 'foo'
        expect(document.body.querySelector('div').getAttribute('foo')).toBe('foo')
    })
    it('multiple attributes update on data change', () => {
        const { template, data } = compile({ data: 'bar' })`<div foo="{{ data }}" bar="{{ data }}">Hello world!</div>`
        render(template)
        data.data = 'foo'
        expect(document.body.querySelector('div').getAttribute('foo')).toBe('foo')
        expect(document.body.querySelector('div').getAttribute('bar')).toBe('foo')
    })
    it('executed javascript updates on data change', () => {
        const { template, data} = compile({ num1: 1, num2: 2 })`<div>My favorite number is {{ num1 + num2 }}</div>`
        render(template)
        data.num1 = 2
        expect(document.body.textContent).toBe('My favorite number is 4')
    })
    it('event handlers register changes in data they reference', (() => {
        const { template } = compile({ num: 0, clickHandler: function () { this.num += 1 }})`
            <button @click="clickHandler">Click me: {{ num }}</button>
        `
        template.querySelector('button').click()
        expect(template.querySelector('button').textContent).toBe('Click me: 1')
    }))
    it.only('updates compiled loop of elements on data change', () => {
        const { template, data } = compile({ messages: ['Hello', 'World'] })`<div><p &each-messages="message">{{ message }}</p></div>`
        render(template)
        data.messages = ['Foo', 'Bar']
        expect(template.textContent).toBe('FooBar')
    })
})
describe('compile', () => {
    it('accepts different delimiters', () => {
        const { template } = compile({ string: 'world' }, ['<%=', '%>'])`<div>Hello <%= string %></div>`
        expect(template.textContent).toBe(`Hello world`)
    })
    it('accepts multiple children at root', () => {
        const { template } = compile({ string: 'world' })`<div>Hello {{ string }}</div><div>{{ string }} hello!</div>`
        expect(template.textContent).toBe(`Hello worldworld hello!`)
    })    
    describe('textContent', () => {
        it('interpolates node content with data', () => {
            const { template } = compile({ string: 'world' })`<div>Hello {{ string }}</div>`
            expect(template.textContent).toBe(`Hello world`)
        })
        it('only interpolates content within matching pair of delimiters', () => {
            const { template } = compile({ string: 'world' })`<div>Hello <span>{{</span> {{ string }}</div>`
            expect(template.textContent).toBe(`Hello {{ world`)
        })
        it('interpolates nested element content with data', () => {
            const { template } = compile({ string: 'world', string2: 'hello' })`<div>Hello {{ string }} <p>{{ string2 }} <span>{{ string }}!</span></p></div>`
            expect(template.textContent).toBe(`Hello world hello world!`)
        })
        it('does not alter non-reactive element content', () => {
            const { template } = compile({ string: 'world' })`<div>Hello {{ string }} <p>hello!</p></div>`
            expect(template.textContent).toBe(`Hello world hello!`)
        })
        it('parses provided javascript', () => {
            const { template } = compile({ num1: 1, num2: 2 })`<div>My favorite number is {{ num1 + num2 }}!</div>`
            expect(template.textContent).toBe(`My favorite number is 3!`)
        })
    })
    describe('attributes', () => {
        it('interpolates node attributes with data', () => {
            const { template } = compile({ data: 'bar' })`<div foo="{{ data }}">Hello world!</div>`
            expect(template.querySelector('div').getAttribute('foo')).toBe('bar')
        })
        it('interpolates multiple node attributes with data', () => {
            const { template } = compile({ data: 'bar' })`<div foo="{{ data }}" bar="{{ data }}">Hello world!</div>`
            expect(template.querySelector('div').getAttribute('foo')).toBe('bar')
            expect(template.querySelector('div').getAttribute('bar')).toBe('bar')
        })
        it('does not alter non-reactive node attributes', () => {
            const { template } = compile({ data: 'bar' })`<div bar="foo"><p foo="{{ data }}">Hello world!</p></div>`
            expect(template.querySelector('div').getAttribute('bar')).toBe('foo')
        })
        it('parses provided javascript', () => {
            const { template } = compile({ num1: 1, num2: 2 })`<div foo="{{ num1 + num2 }}">Hello world!</div>`
            expect(template.querySelector('div').getAttribute('foo')).toBe('3')
        })
        it('adds event listener to element when passed attribute `@[event]`', () => {
            const { template, data } = compile({ clickHandler: vi.fn()})`<button @click="clickHandler">Click me</button>`
            template.querySelector('button').click()
            expect(data.clickHandler).toHaveBeenCalled()
        })
    })
    describe('for loop', () => {
        it('compiles all in a loop of elements', () => {
            const { template } = compile({ messages: ['Hello', 'World'] })`<div><p &each-messages="message">{{ message }}</p></div>`
            expect(template.textContent).toBe('HelloWorld')
        })
    })
})
