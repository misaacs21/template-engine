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

const replaceDelimiters = ({ reactiveData, data }, text, subscriberCallback) => {
    return text.replace(templateRegex, (match) => {
        const value = match.substring(templateDelimiters[0].length, match.length - templateDelimiters[1].length).trim()
        const content = reactiveData[value]
        if (content !== undefined) {
            if (subscriberCallback) subscriberCallback(content)
            return data[value]
        }
        
        const relevantData = Object.keys(data).filter((item) => {
            if (!value.includes(item)) return false
            if (subscriberCallback) subscriberCallback(reactiveData[item])
            return true
        })
        return relevantData.length > 0
            ? Function(...relevantData, `return (${ value })`).bind(data)(...(relevantData.map((key) => data[key])))
            : Function(`return (${ value })`).bind(data)()
    })
}

const compileNode = (root, { reactiveData, data }) => {
    if (root.nodeType === Node.TEXT_NODE) {
        root.textContent = replaceDelimiters({ reactiveData, data }, root.textContent, (data) => data.subscribers.add(new Subscriber(root, 'text')))
    }
    else if (root.nodeType === Node.ELEMENT_NODE) {
        const subscriber = new Subscriber(root, 'attr')
        for (const attribute of root.attributes) {
            switch(attribute.nodeName[0]) {
                case '@':
                    root.addEventListener(attribute.nodeName.substring(1), data[attribute.value].bind(data))
                    break
                case '&':
                    const loopName = attribute.value
                    root.removeAttribute(attribute.nodeName)
                    const loopNodes = []
                    const loopData = data[attribute.nodeName.substring(attribute.nodeName.indexOf('-')+1)]
                    for (let i = 0; i < loopData.length; i++) {
                        const newData = reactive({ [loopName]: loopData[i] }, reactiveData)
                        data[loopName] = newData[loopName]
                        const newNode = compileNode(root.cloneNode(true), { reactiveData, data})
                        loopNodes.push(newNode)
                    }
                    root.replaceWith(...loopNodes)
                    break
                default:
                    root.setAttribute(attribute.nodeName, replaceDelimiters({ reactiveData, data }, attribute.value, (data) => {
                        subscriber.addAttr(attribute.nodeName)
                        data.subscribers.add(subscriber)
                    }))
            }
        }
    }

    if (root.childNodes.length === 0) {
        return root
    }

    for (const child of root.childNodes) {
        compileNode(child, { reactiveData, data })
    }
    return root
}

const reactive = (data, reactiveData) => {
    for (const [key, value] of Object.entries(data)) {
        reactiveData[key] = {
            value: value,
            subscribers: new Set(),
        }
        Object.defineProperty(data, key, {
            get () { return reactiveData[key].value },
            set(val) {
                reactiveData[key].value = val
                for (const subscriber of reactiveData[key].subscribers) {
                    switch (subscriber.updateType) {
                        case 'text':
                            subscriber.domElement.textContent = replaceDelimiters({ reactiveData, data: this }, subscriber.templateContent)
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
    const reactiveData = {}
    reactive(data, reactiveData)
    templateDelimiters = delimiters
    templateRegex = new RegExp(`${templateDelimiters[0]}.*?${templateDelimiters[1]}`, 'gs')
    return (template) => {
        const domTree = document.createDocumentFragment()
        const html = parser.parseFromString(template[0].trim(), 'text/html').body.children

        for (const child of Array.from(html)) {
            domTree.appendChild(child)
        }

        for (const child of domTree.children) {
            compileNode(child, { reactiveData, data })
        }
        return {
            template: domTree,
            data: data
        }
    }
}
export const render = (template, root = document.body) => {
    root.appendChild(template)
}

