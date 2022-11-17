const parser = new DOMParser()
let templateDelimiters
let templateRegex

class Subscriber {
    constructor(domElement, type) {
        this.domElement = domElement;
        this.templateContent = domElement.textContent;
        this.updateType = type;
        this.attrs = [];
    }

    addAttr (attrName) {
        this.attrs.push(attrName)
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

const compileNode = (root, data) => {
    if (root.nodeType === Node.TEXT_NODE) {
        root.textContent = root.textContent.replace(templateRegex, (match) => {
            const key = match.substring(templateDelimiters[0].length, match.length - templateDelimiters[1].length).trim()
            const content = data[key]
            if (content !== undefined) {
                content.subscribers.add(new Subscriber(root, 'text'))
                return content.value
            }
            return match
        })
    }
    else if (root.nodeType === Node.ELEMENT_NODE) {
        const subscriber = new Subscriber(root, 'attr')
        for (const attribute of root.attributes) {
            root.setAttribute(attribute.nodeName, attribute.value.replace(templateRegex, (match) => {
                const key = match.substring(templateDelimiters[0].length, match.length - templateDelimiters[1].length).trim()
                const content = data[key]
                if (content !== undefined) {
                    subscriber.addAttr(attribute.nodeName)
                    content.subscribers.add(subscriber)
                    return content.value
                }
                return match
            }))
        }
    }

    if (root.childNodes.length === 0) {
        return
    }

    for (const child of root.childNodes) {
        compileNode(child, data)
    }
}

export const reactive = (data) => {
    const reactiveData = {}
    for (const [key, value] of Object.entries(data)) {
        reactiveData[key] = {
            value: value,
            subscribers: new Set()
        }
        Object.defineProperty(data, key, {
            get () { return reactiveData[key] },
            set(val) {
                reactiveData[key].value = val
                for (const subscriber of reactiveData[key].subscribers) {
                    switch (subscriber.updateType) {
                        case 'text':
                            subscriber.domElement.textContent = replaceDelimiters(this, subscriber.templateContent)
                            break
                        case 'attr':
                            for (const attr of subscriber.attrs) {
                                subscriber.domElement.setAttribute(attr, val)
                            }
                            break
                    }
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
            compileNode(child, data)
        }
        return domTree
    }
}
export const render = (template, root = document.body) => {
    root.appendChild(template)
}

