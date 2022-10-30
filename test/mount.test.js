import { describe, expect, it } from 'vitest'
import { mount } from '@/mount.js'

describe('mount', () => {
    it('mounts interpolated html to DOM', () => {
        const data = { string: 'world' }
        mount(`<div>Hello ${ data.string }</div>`)
        expect(document.body.children[0].textContent).toBe('Hello world')
    })
})