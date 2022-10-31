const component = {
    template: null,
    keys: null,
    root: null
}

export const reactive = (data) => {
    const reactiveData = {}
    for (let [key, value] of Object.entries(data)) {
        reactiveData[key] = value
        Object.defineProperty(data, key, {
            get() { return reactiveData[key] },
            set(val) {
                reactiveData[key] = val
                const template = compile(this)(component.template, ...component.keys)
                render(template, component.root)
            }
        })
    }
    return data
}

export const compile = (data) => {
    return (template, ...keys) => {
        component.template = template
        component.keys = keys
        let compiled = template[0]
        for (let i = 0; i < keys.length; i++) {
            compiled += data[keys[i]]
            compiled += template[i+1]
        }
        return compiled
    }
}
export const render = (template, root = document.body) => {
    component.root = root
    root.innerHTML = template
}

