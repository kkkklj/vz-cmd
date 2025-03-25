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
export async function compileScss(input, px2rpx, rem2rpx, path, isVmin) {
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
        return replaceUnit(result, px2rpx, rem2rpx, isVmin)
    } catch (error) {
        // console.log('inp-->', input)
        throw error
    }
}
/**
 * 
 * @param {string} data 
 * @param {string} unit 
 * @param {RegExp} reg 
 * @param {number} convert 
 */
export function unitHandler(data, unit, reg, convert) {
    return data.replace(RegExp(reg, 'g'), value => {
        return +(parseFloat(value) * convert).toFixed(2) + unit
    })
}
function getUnitReg(name) {
    if (!name) throw '缺少匹配单位'
    return RegExp('\\.?\\d+(\\.\\d+)?' + name)
}
export function replaceUnit(data, px2rpx = 2, rem2rpx = 200, isVmin = false) {
    String.prototype.replaceCssPx = function(reg) {
        return unitHandler(this, 'rpx', reg, px2rpx)
    }
    String.prototype.replaceCssRem = function(reg) {
        return unitHandler(this, 'rpx', reg, rem2rpx)
    }
    String.prototype.replaceRemVmin = function(reg) {
        return unitHandler(this, 'vmin', reg, rem2rpx * 100 / 750)
    }
    String.prototype.replacePxVmin = function(reg) {
        return unitHandler(this, 'vmin', reg, px2rpx * 100 / 750)
    }
    /**
     * 
     * @param {*[]} list 
     */
    let css = isVmin ? 
    data.css
    .replacePxVmin(getUnitReg('px'))
    .replaceRemVmin(getUnitReg('rem')) : 
    data.css
    .replaceCssPx(getUnitReg('px'))
    .replaceCssRem(getUnitReg('rem'))
    return css
}
/**
 * 
 * @param {string} data 
 * @returns 
 */
export function wx2Vmin(data) {
    String.prototype.replaceCssUnite = function(reg, multiple) {
        return unitHandler(this, 'vmin', reg, multiple)
    }
    return data.replaceCssUnite(getUnitReg('rpx'), 100/750)
    .replaceCssUnite(getUnitReg('vw'), 1)
}