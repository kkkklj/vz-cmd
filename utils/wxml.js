import compiler from 'vue-template-compiler'
const tagMap = {
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
    'var': 'text'
}
/** 
 * @todo 单字母标签匹配bug，i标签 */
export const wxmlReplace = (info) => {
    const before = {
        classTagReplaceClass: tagName => RegExp(`(?<=\\<${tagName}[\\ \s\r\n]*.*)class\\=\\"`,'g'),
        classTagReplaceStartTag: tagName => RegExp(`(?<=\\<)${tagName}(?=[\\ \s\r\n]*.*class)`,'g'),
        noClassAddClass: tagName => RegExp(`(?<=\\<)${tagName}`,'g'),
        endTag: tagName => RegExp(`(?<=\\<\\/)${tagName}`,'g'),
        allTag: tagName => RegExp(`(?<=(\\<|\\<\\/))${tagName}`,'g')
    }
    const after = {
        classTagReplaceClass: old => `class="${old} `,
        classTagReplaceStartTag: n => n,
        noClassAddClass: (n, old) => `${n} class="${old}"`,
        endTag: n => n,
        allTag: n => n
    }
    const tagMap  = new Map();
    const checkConflictTag = (oldTagName) => {
        let conflict = false;
        tagMap.forEach((_old, _new) => {
            if(RegExp(`^${oldTagName}`).test(_new)) {
                conflict = true;
            }
        })
        return conflict;
    }
    
    String.prototype.repalceWxml = function(_old, _new, isTemplate) {
        // const conflict = checkConflictTag(_old);
        // tagMap.set(_old,_new);
        if (isTemplate) {
            return this
            .replaceAll(before.allTag(_old), after.allTag(_new));
        }
        return this
        .replaceAll(before.classTagReplaceClass(_old), after.classTagReplaceClass(_old))
        .replaceAll(before.classTagReplaceStartTag(_old), after.classTagReplaceStartTag(_new))
        .replaceAll(before.noClassAddClass(_old), after.noClassAddClass(_new, _old))
        .replaceAll(before.endTag(_old), after.endTag(_new));
    }
    
    return info
    .repalceWxml('span', 'text')
    .repalceWxml('strong', 'text')
    .repalceWxml('div', 'view')
    .repalceWxml('header', 'view')
    .repalceWxml('article', 'view')
    .repalceWxml('footer', 'view')
    .repalceWxml('h1', 'view')
    .repalceWxml('h2', 'view')
    .repalceWxml('h3', 'view')
    .repalceWxml('h4', 'view')
    .repalceWxml('h5', 'view')
    .repalceWxml('h6', 'view')
    .repalceWxml('main', 'view')
    .repalceWxml('nav', 'view')
    .repalceWxml('section', 'view')
    .repalceWxml('ul', 'view')
    .repalceWxml('li', 'view')
    .repalceWxml('ol', 'view')
    .repalceWxml('p', 'view')
    .repalceWxml('img', 'image')
    .repalceWxml('var', 'text')
    .repalceWxml('label', 'text')
    // .repalceWxml('i', 'text')
    .repalceWxml('template', 'block', true)
    .replaceAll('@click.stop','catchtap')
    .replaceAll('@click','bind:tap')
    .replaceAll(':src','src')
    .replaceAll(':class','class')
    .replaceAll(/(?<=\s)\:key/g,'wx:key')
    
    // .repalceWxml('i\\>', 'text')
}
export const vueDirectReplace = (info) => {
    String.prototype.addDoubleBrackets = function(direct = 'v\\-if') {
        const it = this.matchAll(RegExp(`(?<=(${direct}\\=\\")).*?(?=\\")`,'g'));
        let result = it.next();
        let str = this;
        let time = 0;
        while(!result.done) {
            const value = result.value[0]
            const index = result.value.index + time * 4;
            str = str.slice(0, index) + '{{' + value + '}}' + str.slice(index + value.length)
            time ++ ;
            result = it.next();
        }
        return str
    }
    return info
    .addDoubleBrackets('v\\-if')
    .addDoubleBrackets('v\\-else\\-if')
    .addDoubleBrackets('\:src')
    .replaceAll('v-if=','wx:if=')
    .replaceAll('v-else-if=','wx:elif=')
    .replaceAll('v-else','wx:else')
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
const renderClass = (staticClass, classBinding) => {
    let className = '';
    let _bind = '';
    let _static = ''
    classBinding = classBinding?.trim() || ''
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
                } else {
                    val += ` ${str.slice(1,-1)}`
                }
                return val
            },'').trim();
        } else if (/^\{/.test(classBinding)) {
            _bind = parseObj(classBinding)
        }
    }
    if (staticClass) {
        _static = staticClass.slice(1,-1);
    }
    className = `class="${_static||''}${_bind ? _static && ' ' || '' + _bind : ''}"`;
    return className === 'class=""' ? '' : ' ' + className
}
const circularSet = new Set()
export const wxml2Compiler = (info) => {
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
            const tagAttrs = renderClass(node.staticClass, node.classBinding)
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