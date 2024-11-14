import compiler from 'vue-template-compiler'
export const tagMap = {
    "span": 'text',
    'strong': 'text',
    'div': 'view',
    'header': 'view',
    'article': 'view',
    'footer': 'view',
    'h1': 'view',
    'h2': 'view',
    'h3': 'view',
    'h4': 'view',
    'h5': 'view',
    'h6': 'view',
    'main': 'view',
    'nav': 'view',
    'section': 'view',
    'ul': 'view',
    'li': 'view',
    'ol': 'view',
    'p': 'view',
    'img': 'image',
    'var': 'text',
    'i': 'text',
    'template': 'block'
}
const getsfc = function(content) {
    let output = compiler.parseComponent(content)
    return output
}
const compileTpl = function(tpl) {
    let output = compiler.compile(tpl, { comments: true, preserveWhitespace: false, shouldDecodeNewlines: true })
    return output
}
/**
 * 
 * @param {String} staticClass 
 * @param {String} classBinding 
 */
const parseObj = oStr => oStr.slice(1, -1).split(',').map(i => i.trim())
.map(kv => {
    const [k, v] = kv.split(':');
    return `{{${v}?'${k}':''}}`
}).join(' ');
export const renderBindClass = classBinding => {
    let _bind = '';
    if (classBinding) {
        if (/^\[/.test(classBinding)) {
            _bind = classBinding.replace(/^\[/,'').replace(/\]$/,'');
            const bindStrs = _bind.split(',');
            _bind = bindStrs.reduce((val, str) => {
                str = str.trim();
                if (/(\&|\?)/.test(str)) {
                    val += ` {{${str}}}`
                } else if (/^\{/.test(str)) {
                    val += ` ${parseObj(str)}`
                } else if (/\$\{.*\}/.test(str)) {
                    val += ' ' + str.replaceAll('${','{{').replaceAll('}','}}')
                } else {
                    // history .slice(1,-1) 会截断变量的头尾
                    val += (
                        /^\'.*\'$/.test(str) 
                        || /^\`.*\`$/.test(str)
                        || /^\".*\"$/.test(str)
                    )
                    && ` ${str.slice(1, -1)}`
                    || ` {{${str}}}`
                }
                
                return val
            },'').trim();
        } else if (/^\{/.test(classBinding)) {
            _bind = parseObj(classBinding).trim();
        }
    }
    return _bind;
}
const renderClass = (staticClass, classBinding, renderTagName) => {
    let className = '';
    let _bind = renderBindClass(classBinding);
    let _static = ''
    classBinding = classBinding?.trim() || ''
    if (staticClass) {
        _static = staticClass.slice(1,-1);
    }
    const getClassName = (renderTagName) => {
        const classList = `${_static||''}${_bind ? (_static && ' ' || '') + _bind : ''}`
        return renderTagName ? `class="${renderTagName}${classList ? ` ${classList}` : ''}"`
        : `class="${classList}"`
    }
        
    className = getClassName();
    return renderTagName ?
    ' ' + getClassName(renderTagName)
    : className === 'class=""' ? '' : ' ' + getClassName()
}
const circularSet = new Set()
export const wxml2Compiler = (info, tagInClass) => {
    const sfc = getsfc(info)
    const astRes = compileTpl(sfc.template.content).ast
    const ast = astRes;
    // ast.children = [];
    /*** @param {typeof ast} node */
    const renderIf = (node) => {
        if ((!node.directives || !node.directives.length) && !node.if && !node.elseif) {
            return ''
        }
        const showVal = node.directives?.find(i => i.name === 'show')?.value || '';
        if (node.elseif) {
            const elVal = node.elseif || '';
            const val = elVal + ((elVal && showVal ? '&&' : '') + showVal);
            return val ? ` wx:elif="{{${val}}}"` : ''
        }
        const ifVal = node.if || '';
        const val = ifVal + ((ifVal && showVal ? '&&' : '') + showVal);
        return val ? ` wx:if="{{${val}}}"` : ''
    }
    /*** @param {typeof ast} node */
    const renderModel = (node) => {
        if (!node.directives || !node.directives.length) {
            return '';
        }
        const modelItem = node.directives.find(i => i.name === 'model')
        const modelVal = modelItem?.value || '';
        if (!modelVal) {
            return ''
        }
        if (modelItem.rawName === 'v-model') {
            return ` vModel="{{${modelVal}}}"`
        }
        return ` ${modelItem.arg}="{{${modelVal}}}"`
    }
    const renderEvent = (node) => {
        const {events} = node;
        if (!events) {
            return ''
        }
        const evMap = {
            click: 'tap'
        }
        const evs = Object.keys(events).map((k) => {
            const {modifiers, value} = events[k];
            let evModify = modifiers?.stop ? 'catch' : 'bind';
            let ev = evMap[k] || k;
            return `${evModify + ev}="${value}"`;
        })
        return ' ' + evs.join(' ')
    }
    const renderAttrs = (node) => {
        const {attrs} = node;
        if (!attrs) {
            return ''
        }
        const _attrs = attrs.map(attr => {
            if (!(typeof attr.dynamic === 'boolean')) {
                return `${attr.name}=${attr.value}`
            }
            return `${attr.name}="{{${attr.value}}}"`
        }).join(' ')
        return _attrs ? ' ' + _attrs : '';
    }
    const renderFor = (node) => {
        if (!node.for) {
            return ''
        }
        const setVal = (beforeStr, val) => val ? ` ${beforeStr}="${val}"` : ''
        let forKey = node.key
        if (forKey && RegExp('^' + node.alias).test(node.key)) {
            forKey = forKey.replace(RegExp('^' + node.alias + '\\.'),'')
        }
        return ` wx:for="{{${node.for}}}"`
        + setVal('wx:for-item', node.alias)
        + setVal('wx:for-index', node.iterator1)
        + setVal('wx:key', forKey)
    }
    /**
     * @param {(typeof ast)[]} ast 
     */
    const render = (ast) => {
        return ast.map(node => {
            const tagName = node.tag;
            const children = node.children;
            const _tagName = tagMap[tagName] || tagName;
            if (node.ifConditions?.length > 1 && !circularSet.has(node.ifConditions)) {
                circularSet.add(node.ifConditions);

                // console.log('-->',node.ifConditions)
                return render(node.ifConditions.map(i => i.block))
            }
            const classNames = tagInClass && tagMap[node.tag]
            ? renderClass(node.staticClass, node.classBinding, node.tag)
            : renderClass(node.staticClass, node.classBinding)
            const tagAttrs = (_tagName === 'block' ? '' : classNames)
            + renderModel(node)
            + renderAttrs(node)
            + renderEvent(node)
            + renderFor(node)
            + renderIf(node)
            let temp = (childs) => `<${_tagName}${tagAttrs}>${childs}</${_tagName}>`;
            if (node.type === 3 || node.type === 2) {
                return node.isComment ? `\n<!-- ${node.text} -->\n` : node.text
            }
            return temp(
                children ? render(children) : ''
            )
        }).join('')
    }
    return render([ast]);
}