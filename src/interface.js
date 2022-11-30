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

const replaceDelimiters = (data, text, subscriberCallback) => {
    return text.replace(templateRegex, (match) => {
        const key = match.substring(templateDelimiters[0].length, match.length - templateDelimiters[1].length).trim()
        const content = data[key]
        if (content !== undefined) {
            if (subscriberCallback) subscriberCallback(content)
            return content.value
        }

        return match
    })
}

const compileNode = (root, data) => {
    if (root.nodeType === Node.TEXT_NODE) {
        root.textContent = replaceDelimiters(data, root.textContent, (data) => data.subscribers.add(new Subscriber(root, 'text')))
    }
    else if (root.nodeType === Node.ELEMENT_NODE) {
        const subscriber = new Subscriber(root, 'attr')
        for (const attribute of root.attributes) {
            root.setAttribute(attribute.nodeName, replaceDelimiters(data, attribute.value, (data) => {
                subscriber.addAttr(attribute.nodeName)
                data.subscribers.add(subscriber)
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

