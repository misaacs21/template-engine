const parser = new DOMParser()
let templateDelimiters
let templateRegex

class Subscriber {
    constructor(domElement) {
        this.domElement = domElement;
        this.templateContent = domElement.textContent;
    }
}

const replaceDelimiters = (data, text) => {
    return text.replace(templateRegex, (match) => {
        const key = match.substring(templateDelimiters[0].length, match.length - templateDelimiters[1].length).trim()
        const content = data[key]
        if (content !== undefined) {
            return content.value
        }
        return match
    })
}

const compileNodeChildren = (root, data) => {
    if (root.childNodes.length === 0) {
        return
    }
    for (let child of root.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            child.textContent = child.textContent.replace(templateRegex, (match) => {
                const key = match.substring(templateDelimiters[0].length, match.length - templateDelimiters[1].length).trim()
                const content = data[key]
                if (content !== undefined) {
                    content.subscribers.push(new Subscriber(child))
                    return content.value
                }
                return match
            })        
        }
        compileNodeChildren(child, data)
    }      
}

export const reactive = (data) => {
    const reactiveData = {}
    for (let [key, value] of Object.entries(data)) {
        reactiveData[key] = {
            value: value,
            subscribers: []
        }
        Object.defineProperty(data, key, {
            subscribers: [],
            get () { return reactiveData[key] },
            set(val) {
                reactiveData[key].value = val
                for (let subscriber of reactiveData[key].subscribers) {
                    subscriber.domElement.textContent = replaceDelimiters(this, subscriber.templateContent)
                }
            }
        })
    }
    return data
}

export const compile = (data, delimiters = ['{{', '}}']) => {
    templateDelimiters = delimiters
    templateRegex = new RegExp(`${templateDelimiters[0]}.*?${templateDelimiters[1]}`, 'gs')
    return (template) => {
        const domTree = document.createDocumentFragment()
        const html = parser.parseFromString(template[0], 'text/html').body.children
        for (const child of html) {
            domTree.appendChild(child)
        }
        for (const child of domTree.children) {
            compileNodeChildren(child, data)
        }
        return domTree
    }
}
export const render = (template, root = document.body) => {
    root.appendChild(template)
}

