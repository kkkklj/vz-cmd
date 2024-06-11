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