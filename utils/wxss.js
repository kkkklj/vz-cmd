import * as sass from "sass";
import { existsSync, unlinkSync, writeFileSync } from 'fs';
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
 * @param {string} input 
 * @returns 
 */
export async function compileScss(input) {
    input = input.replace(/\@import[\ ]+.*scss[\;]*'/g, '')
    const result = await sass.compileStringAsync(input)
    return replaceUnit(result)
}
function replaceUnit(data, px2rpx = true, rem2rpx = true) {
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
    let css = data.css
    .replaceCssPx('\\d{3}(?=px)',px2rpx)
    .replaceCssPx('\\d{2}(?=px)',px2rpx)
    .replaceCssPx('\\d{1}(?=px)',px2rpx);
    
    css = css.replaceCssRem(/(\d+)(\.\d+)?rem/, rem2rpx)
    return css
}