const parser = new DOMParser()
let templateDelimiters
let templateRegex

class Subscriber {
    constructor(domElement, type, { loopNodes = [], loopName = '', loopDataName = '', loopTemplateElement = null } = {}) {
        this.domElement = domElement;
        this.templateContent = domElement.textContent;
        this.updateType = type;
        this.attrs = [];
        this.loopNodes = loopNodes
        this.loopName = loopName
        this.loopDataName = loopDataName
        this.loopTemplateElement = loopTemplateElement
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
                    const fnName = attribute.value.indexOf('(') > 0 ? attribute.value.substring(0, attribute.value.indexOf('(')) : attribute.value
                    const args = attribute.value.indexOf('(') > 0 ? attribute.value.substring(attribute.value.indexOf('(') + 1, attribute.value.indexOf(')')).split(',') : []
                    const filledArgs = args.map((arg) => {
                        const match = arg.match(new RegExp(`${templateDelimiters[0]}(.*?)${templateDelimiters[1]}`, 's'))
                        const cleanArg = match ? match[1].trim() : arg.trim()
                        if (match) {
                            const relevantData = Object.keys(data).filter((item) => {
                                if (!cleanArg.includes(item)) return false
                                return true
                            })                
                            return Function(...relevantData, `return (${ cleanArg })`).bind(data)(...(relevantData.map((key) => data[key])))    
                        }
                        return cleanArg
                    })
                    root.addEventListener(attribute.nodeName.substring(1), data[fnName].bind(data, ...filledArgs))
                    break
                case '&':
                    root.removeAttribute(attribute.nodeName)
                    const loopNodes = []
                    const loopName = attribute.nodeName.substring(attribute.nodeName.indexOf('-')+1)
                    const dataName = attribute.value
                    const loopData = data[loopName]
                    const parent = root.parentElement
                    const cloneTemplate = root.cloneNode(true)
                    for (let i = 0; i < loopData.length; i++) {
                        let newNode = cloneTemplate.cloneNode(true)
                        newNode.innerHTML = newNode.innerHTML.replace(new RegExp(`(${templateDelimiters[0]}.*?)(${dataName})(.*?${templateDelimiters[1]})`, 'gs'), `$1${loopName}[${i}]$3`)
                        newNode = compileNode(newNode, { reactiveData, data })
                        loopNodes.push(newNode)
                    }
                    root.replaceWith(...loopNodes)
                    root.remove()
                    root.replaceChildren()
                    reactiveData[loopName].loopSubscribers.add(new Subscriber(parent, 'loop', {
                        loopNodes,
                        loopName,
                        loopDataName: dataName,
                        loopTemplateElement: cloneTemplate
                    }))
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

const updateNodes = (subscribers, loopSubscribers, reactiveData, baseData, newVal) => {
    for (const subscriber of loopSubscribers) {
        switch (subscriber.updateType) {
            case 'loop':
                for (let i = 0; i < subscriber.loopNodes.length; i++) {
                    subscriber.domElement.removeChild(subscriber.loopNodes[i])
                    subscriber.loopNodes[i].remove()
                    subscriber.loopNodes[i].replaceChildren()
                }
                const loopData = baseData[subscriber.loopName]
                const loopNodes = []
                for (let i = 0; i < loopData.length; i++) {
                    let newNode = subscriber.loopTemplateElement.cloneNode(true)
                    newNode.innerHTML = newNode.innerHTML.replace(new RegExp(`(${templateDelimiters[0]}.*?)(${subscriber.loopDataName})(.*?${templateDelimiters[1]})`, 'gs'), `$1${subscriber.loopName}[${i}]$3`)
                    newNode = compileNode(newNode, { reactiveData, data: baseData })
                    loopNodes.push(newNode)
                }
                subscriber.loopNodes = loopNodes
                subscriber.domElement.replaceChildren(...loopNodes)
                break
        }
    }
    for (const subscriber of subscribers) {
        if (!subscriber.domElement.isConnected) subscribers.delete(subscriber)
        else { 
            switch (subscriber.updateType) {
                case 'text':
                    subscriber.domElement.textContent = replaceDelimiters({ reactiveData, data: baseData }, subscriber.templateContent)
                    break
                case 'attr':
                    for (const attr of subscriber.attrs) {
                        subscriber.domElement.setAttribute(attr, newVal)
                    }
                    break
            }
        }
    }
}

const reactive = (data, reactiveData) => {
    for (const [key, value] of Object.entries(data)) {
        reactiveData[key] = {
            value: value,
            subscribers: new Set(),
            loopSubscribers: new Set(),
        }
        // return proxy from get for nested object properties within array, but kills browser
        Object.defineProperty(data, key, {
            get () { return reactiveData[key].value },
            set(value) {
                reactiveData[key].value = value
                if (value && typeof value === 'object') {
                    reactiveData[key].value = new Proxy(reactiveData[key].value, {
                        set (target, name, val) {
                            target[name] = val
                            updateNodes(reactiveData[key].subscribers, reactiveData[key].loopSubscribers, reactiveData, data, val)
                            return true
                        }
                    })
                }        
                updateNodes(reactiveData[key].subscribers, reactiveData[key].loopSubscribers, reactiveData, this, value)
            }
        })
        if (value && typeof value === 'object') {
            reactiveData[key].value = new Proxy(reactiveData[key].value, {
                set (target, name, val) {
                    target[name] = val
                    updateNodes(reactiveData[key].subscribers, reactiveData[key].loopSubscribers, reactiveData, data, val)
                    return true
                }
            })
        }
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
        const html = parser.parseFromString(template.trim(), 'text/html').body.children.main.children
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
    const main = document.createElement('div')
    main.setAttribute('id', 'main')

    main.appendChild(template)
    document.body.replaceChild(main, document.body.firstElementChild);
}
