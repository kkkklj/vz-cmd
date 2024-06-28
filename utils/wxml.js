import compiler from 'vue-template-compiler'
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
    const map = {
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
    return `{{${v}?${k}:''}}`
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
            _bind = ''
        }
    }
    if (staticClass) {
        _static = staticClass.slice(1,-1);
    }
    className = `class="${_static||''}${_bind ? _static && ' ' || '' + _bind : ''}"`;
    return className === 'class=""' ? '' : '' + className
}
export const wxml2Compiler = (info) => {
    const sfc = getsfc(info)
    const astRes = compileTpl(sfc.template.content).ast
    const ast = astRes.children[0];
    // ast.children = [];
    /**
     * 
     * @param {(typeof ast)[]} ast 
     */
    const render = (ast) => {
        return ast.map(node => {
            const tagName = node.tag;
            const children = node.children;
            
            let temp = (childs) => `<view ${renderClass(node.staticClass, node.classBinding)}>${childs}</view>`;
            if (tagName === 'img') {
                temp = (childs) => `<image>${childs}</image>`;
            }
            return temp(
                children ? render(children) : ''
            )
        }).join('')
    }

    console.log('astRes-->', ast, render([ast]))
    console.log('staticClass-->', ast.staticClass)
}