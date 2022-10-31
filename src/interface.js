export const compile = (data) => {
    return (template, ...keys) => {
        let compiled = template[0]
        for (let i = 0; i < keys.length; i++) {
            compiled += data[keys[i]]
            compiled += template[i+1]
        }
        return compiled
    }
}
export const render = (template, root = document.body) => {
    root.innerHTML = template
}

