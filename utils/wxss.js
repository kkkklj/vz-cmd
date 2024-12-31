import * as sass from "sass";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
/**
 * 
 * @param {string} info 
 */
export const scssParse = (path, {px2rpx, rem2rpx}) => {
    
   const result = sass.compileAsync(path);
   result.then(data => {
        const css = replaceUnit(data)
        const name = 't.css';
        if (existsSync(name)) {
            unlinkSync(name);
        }
        writeFileSync(name, css);
   })
}
/**
 * 
 * @param {*} input 
 * @param {*} px2rpx 
 * @param {*} rem2rpx 
 * @param {string} path 
 * @returns 
 */
export async function compileScss(input, px2rpx, rem2rpx, path) {
    // input = input.replace(/\@import[\ ]+.*scss[\;]*'/g, '')
    try {
        /** @type {*[]} */
        let importList = input.match(/\@import[\ ]+.*scss[\;]*'[;]{0,1}/g)
        if (importList?.length) {
            importList = importList.map(i => i.trim()).map(i => i.replace(/\;$/,'').replace(/\@import[\ ]+/, '').replace(/^[\'|\"]/, '').replace(/[\'|\"]$/, ''))
            // const rawPath = 
            importList = importList.map(imp => {
                /**  最后一个元素是vue文件 */
                const curDir = path.split(/\\/).slice(0, -1)
                const nList = imp.split(/\//).reduce((list, item) => {
                    if (item === '..') {
                        curDir.pop()
                    } else if (item === '.') {
                        // 啥都不干
                    } else {
                        list.push(item)
                    }
                    return list
                }, [])
                return curDir.concat(nList).join('/')
            })
            // await
            input = input.replace(/\@import[\ ]+.*scss[\;]*'/g, '')
            input = importList.map(filePath => readFileSync(filePath, 'utf-8')).join('\n') + input
        }
        const result = await sass.compileStringAsync(input)
        return replaceUnit(result, px2rpx, rem2rpx)
    } catch (error) {
        // console.log('inp-->', input)
        throw error
    }
}
function replaceUnit(data, px2rpx = 2, rem2rpx = 200) {
    String.prototype.replaceCssPx = function(reg, multiple) {
        const it = this.matchAll(RegExp(reg,'g'));
        let result = it.next();
        let str = this;
        let offset = 0;
        while(!result.done) {
            const value = result.value[0];
            const index = result.value.index + offset;
            str = str.slice(0, index) + (parseInt(value) * multiple) + 'r' + str.slice(index + value.length)
            offset += (value * multiple + '').length - (value + '').length + 1;
            result = it.next();
        }
        return str
    }
    String.prototype.replaceCssRem = function(reg, multiple) {
        const it = this.matchAll(RegExp(reg,'g'));
        let result = it.next();
        let str = this;
        let offset = 0;
        while(!result.done) {
            const value = result.value[0];
            const index = result.value.index + offset;
            str = str.slice(0, index) + Math.round(parseFloat(value) * multiple) + 'rpx' + str.slice(index + value.length)
            offset += (Math.round(parseFloat(value) * multiple) + '').length - (parseFloat(value) + '').length;
            result = it.next();
        }
        return str
    }
    /**
     * 
     * @param {*[]} list 
     */
    // String.prototype.replaceHtmlTag = function(list) {
    //     let str = this
    //     list.forEach(item => {
    //        str = str.replace(RegExp(`(?<=[A-Za-z]\\ )${item}(?=[^\\n]*\\})`), `.${item}`)
    //     })
    //     return str
    // }
    let css = data.css
    .replaceCssPx('\\d{3}(?=px)',px2rpx)
    .replaceCssPx('\\d{2}(?=px)',px2rpx)
    .replaceCssPx('\\d{1}(?=px)',px2rpx)
    // .replaceHtmlTag(['img','div', 'span', 'p', 'i', 'var', 'h1', 'h2', 'h3', 'h4', 'h5', 'ul', 'ol', 'li', 'dl', 'dt', 'strong', 'header', 'article', 'footer', 'nav', 'section'])
    
    css = css.replaceCssRem(/(\d+)(\.\d+)?rem/, rem2rpx)
    return css
}