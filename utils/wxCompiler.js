import { parse, compileTemplate } from '@vue/compiler-sfc'
import { readFileSync, writeFileSync, existsSync, unlinkSync, statfsSync, mkdir, mkdirSync, stat } from 'fs';
import { isTernary, parseObj, renderBindClass, tagMap } from './wxml.js';
import { ENUM_NODE_TYPE, ENUM_TEMPLATE_RECORD_ON } from '../enum/sfc.enum.js';
import { compileScss } from './wxss.js';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { wxJs, wxJson } from '../template/wxTemp.js';
import { compileTpl } from './wxml2.js';
import { writeFile } from './io.js';
export const getsfc = function(content) {
  return parse(content).descriptor
}
const TYPE_FUNC = 'function'
const TYPE_STRING = 'string'
const TYPE_NUMBER = 'number'
const TYPE_BOOL = 'boolean'
const TYPE_ARR = 'array'
const TYPE_OBJECT = 'object'
/** 开关是否关闭 */
const switchOff = (sw, type) => !(sw & type)
/**
 * 
 * @param {string} path 
 * @param {Map<string, string>} compMap 
 * @returns 
 */
const compileVueFile = async (path, compMap, px2rpx, rem2rpx, sw, isVmin = false) => {
  const info = readFileSync(path, 'utf-8')
  const sfc = getsfc(info)
  const { template, script, styles} = sfc
  let fileStates = new Set()
  /**
   * 
   * @param {string} state 
   * @param {boolean} checkBool 
   * @param {Set<string>|null} scopes
   */
  function recordState(state, checkBool, scopes = null) {
    if (sw === 0) return
    let type = TYPE_STRING
    const varReg = /^[0-9a-zA-Z_]+/
    const firstVar = state.match(varReg)?.[0]
    if (scopes && scopes.has(firstVar)) {
      return
    }
    const record = () => {
      const pState = state.match(varReg)?.[0]
      if (pState) {
        fileStates.add(`${pState}:${type}`)
      }
    }
    if (checkBool) {
      if (state === firstVar || state === ('!' + state)) {
        if (switchOff(sw, ENUM_TEMPLATE_RECORD_ON.state)) return
        type = TYPE_BOOL
        return record()
      }
    }
    if (firstVar) {
      const isArray = RegExp(`${firstVar}\\[\\d+\\]`).test(state)
      const isChain = RegExp(`${firstVar}\\.`).test(state)
      const isExec = RegExp(`${firstVar}\\(`).test(state)
      
      if (isChain) {
        type = TYPE_OBJECT
        
        const properIsFn = RegExp(`(?<=^${firstVar}\\.)[0-9a-zA-Z_]+(?=\\()`)
        const properFnName = state.match(properIsFn)?.[0]
        const properIsLen = RegExp(`(?<=^${firstVar}\\.)length`).test(firstVar)
        if (properFnName) {
          const checkType = obj => Object.hasOwn(obj.prototype, properFnName)
          if (checkType(String)) {
            type = TYPE_STRING
          } else if (checkType(Number)) {
            type = TYPE_NUMBER
          }
        } else if (properIsLen) {
          type = TYPE_ARR
        }
      }
      if (isExec) {
        type = TYPE_FUNC
      }
      if (isArray) {
        type = TYPE_ARR
      }
      if (type === TYPE_FUNC) {
        if (switchOff(sw, ENUM_TEMPLATE_RECORD_ON.method)) return
      } else {
        if (switchOff(sw, ENUM_TEMPLATE_RECORD_ON.state)) return
      }
      record()
    }
  }
  /**
   * 
   * @param {string} key 
   */
  function recerdStateByType(key, type) {
    if (sw === 0) return
    if (type === TYPE_FUNC) {
      if (switchOff(sw, ENUM_TEMPLATE_RECORD_ON.method)) return
      if (/\./.test(key)) return
      if (/\$emit/.test(key)) return
      if (/\=/.test(key)) return
      if (/\+\+/.test(key)) return
    }
    if (type === TYPE_ARR) {
      key = key.split('.')[0]
    }
    key = key.replace(/\(.*\)/, '')
    if (switchOff(sw, ENUM_TEMPLATE_RECORD_ON.state) && type !== TYPE_FUNC) return
    fileStates.add(`${key}:${type}`)
  }
  const compileTemplate2Wxml = () => {
    function renderProps(props, originTagName, scopes) {
      if (!props) return ''
      let classValue = ''
      let attrs = ''
      attrs = props.map((prop) => {
        prop.name === 'class' && (classValue += staticClass(prop))
        if (prop.name === 'bind' && prop.rawName === ':class') {
          classValue = classValue ? classValue + ' ' : ''
          classValue = classValue + bindClass(prop)
          return ''
        }
        return model(prop, scopes) + 
        propFor(prop) +
        propForKey(props, prop) + 
        propStaticAttr(prop) +
        propDyAttr(prop, scopes) +
        propShow(prop, scopes) + 
        propIf(prop, scopes) + 
        propEvent(prop)
      }).join(' ')
      const setOriginTag = (classValue) => {
        return originTagName ? `${originTagName}${classValue ? ' ' + classValue : ''}` : classValue
      }
      const classAttr = classValue ? `class="${setOriginTag(classValue)}"` : `class="${setOriginTag('')}"`
      attrs = classAttr + ((attrs && classAttr) ? ' ' : '') + attrs
      return attrs
    }
    function staticClass(prop) {
      // proptype 6
      return prop.value.content
    }
    function bindClass(prop) {
      // proptype 7
      return renderBindClass(propCont(prop))
    }
    /**
     * @returns {string}
     */
    function propCont(prop) {
      return prop.exp?.content?.split(/\n/).map(i => i.trim()).join(' ') || ''
    }
    function propBindKey(prop) {
      if (prop.arg) {
        return prop.arg.content
      }
      return prop.name
    }
    function model(prop, scopes) {
      if (!prop.name !== 'model') return ''
      const value = propCont(prop)
      value && recordState(value, false, scopes)
      return `${propBindKey(prop)}="{{${value}}}"`
    }
    function propEvent(prop) {
      if (prop.name !== 'on') return ''
      let prefix = 'bind:'
      if (prop?.modifiers?.length && prop.modifiers.find(i => i === 'stop')){
        prefix = 'catch:'
      }
      const key = propBindKey(prop)
      const evMap = {
        click: 'tap'
      }
      const value = propCont(prop)
      value && recerdStateByType(value, TYPE_FUNC)
      return `${prefix}${evMap[key] || key}="${value}"`
    }
    function propIf(prop, scopes) {
      // proptype 7
      if (!['if', 'else-if', 'else'].includes(prop.name)) return ''
      let key = 'if'
      if (prop.name === 'else-if') {
        key = 'elif'
      } else if (prop.name === 'else') {
        key = 'else'
        return 'wx:else'
      }
      const value = propCont(prop)
      recordState(value, true, scopes)
      return `wx:${key}="{{${value}}}"`
    }
    function propShow(prop, scopes) {
      // proptype 7
      if (prop.name !== 'show') return ''
      const value = propCont(prop)
      recordState(value, true, scopes)
      return `hidden="{{!(${value})}}"`
    }
    function propFor(prop) {
      // proptype 7
      if (prop.name !== 'for') return ''
      const setAttr = (beforeStr, val) => val ? ` ${beforeStr}="${val}"` : ''
      const { value, index, list } = scopeFor(prop)
      recerdStateByType(list, TYPE_ARR)
      return `wx:for="{{${list}}}"` + 
      setAttr('wx:for-item', value) +
      setAttr('wx:for-index', index)
    }
    function propForKey(props, prop) {
      // proptype 7
      if (prop.name !== 'bind' || prop.rawName !== ':key') return ''
      const forProp = props.find(prop => prop.name === 'for')
      if (!forProp) return ''
      const { forParseResult } = forProp
      const itemName = forParseResult?.value?.content
      let value = propCont(prop)
      if (itemName) {
        value = value.replace(RegExp(`^${itemName}.`), '')
      }
      return `wx:key="${value}"`
    }
    function propDyAttr(prop, scopes) {
      // proptype 7
      if (prop.name !== 'bind') return ''
      if (prop.rawName === ':key') return ''
      let value = propCont(prop)
      recordState(value, false, scopes)
      
      if (/^\{/.test(value)) {
        if (prop.rawName === ':style') {
          value = objectStyleParse(value)
        } else {
          value = parseObj(value)
        }
      } else {
        value = `{{${value}}}`
      }
      return `${propBindKey(prop)}="${value}"`
    }
    function propStaticAttr(prop) {
      // proptype 6
      try {
        if (prop.type !== 6) return ''
        if (prop.name === 'class') return ''
        if (!prop?.value?.content) {
          return prop.name
        }
        return `${prop.name}="${prop.value.content}"`
      } catch (error) {
        console.log('errr->', prop)
      }
    }
    function scopeFor(prop, scopes) {
      const { forParseResult } = prop
      const value = forParseResult?.value?.content
      const index = forParseResult?.key?.content
      const list = forParseResult.source.content
      return { value, index, list }
    }
    /**
     * @param {typeof sfc.template.ast.children[0]} node 
     * @param {Set<string>|null} scopes
     */
    const nodeCompiler = (node, scopes = null) => {
      const tag = node.tag
      /** @type {*[]} */
      const props = node.props
      const tagName = tagMap[tag] || tag
      let attrs = renderProps(props, tag, scopes)
      attrs = attrs ? ' ' + attrs : ''
      const space = Array.from({
        length: node.loc.start.column - 1,
      }, () => '').join('')
      if (node.type === ENUM_NODE_TYPE.comment) {
        return `${space}<!-- ${node.content} -->`
      }
      if (node.type === ENUM_NODE_TYPE.content) {
        return space + node.content
      }
      if (node.type == ENUM_NODE_TYPE.state) {
        /** @type {string} */
        const state = node.content.content  
        recordState(state, false, scopes)
        return `{{${state}}}`
      }
      const temp = (childs) => {
        return `${space}<${tagName}${attrs}>${childs}</${tagName}>`
      }
      const forProp = props.find(prop => prop.name === 'for')
      if (forProp) {
        scopes = new Set()
        const { value, index } = scopeFor(forProp)
        scopes.add(value)
        scopes.add(index)
      }
      return temp(
        node.children?.length 
        ? node.children.map(childNode => nodeCompiler(childNode, scopes)).join('')
        : ''
      );
    }
    return template.ast.children.map(node => {
      return nodeCompiler(node)
    }).join('')
  }
  let wxss = ''
  for (let index = 0; index < styles.length; index++) {
    const style = styles[index];
    const output = await compileScss(style.content, px2rpx, rem2rpx, path, isVmin)
    wxss += output +'\r\n'
  }
  const wxml = compileTemplate2Wxml()
  const states = []
  fileStates = filterSameState(fileStates)
  fileStates.forEach(value => {
    const [key, type] = value.split(':')
    if (type === TYPE_FUNC) return
    const findIndex = states.findIndex(state => state.key === key)
    if (findIndex > -1) {
      if (type === TYPE_STRING) return
      if (states[findIndex].type === TYPE_STRING)
      states.splice(findIndex, 1)
    }
    states.push({
      key, type
    })
  })
  const methods = []
  fileStates.forEach(value => {
    const [key, type] = value.split(':')
    if (type !== TYPE_FUNC) return
    methods.push({
      key, type
    })
  })
  const _components = []
  if (compMap) {
    const astRes = compileTpl(sfc.template.content)
    const { ast } = astRes
    const { components } = ast
    const miniVanNoSupport = [
      'van-badge',
      'van-form',
      'van-address-edit',
      'van-list',
      'van-popover'
    ]
    components.forEach(name => {
      let path = ''
      if (/^van\-/.test(name)) {
        if (miniVanNoSupport.includes(name)) return
        path = `@vant/weapp/${name.replace(/^van\-/, '')}/index`
      } else {
        name = name.replace(/\-[a-z]/g, val => {
          return val[1].toUpperCase()
        })
        path = compMap.get(name)
      }
      
      if (path) {
        _components.push({
          name,
          path
        })
      }
    })
  }
  return {
    wxml, 
    wxss,
    states,
    methods,
    components: _components
  }
}
/**
 * 
 * @param {string} path 
 */
export const createComponentFiles = async (path, compMap, outputPath, px2rpx, rem2rpx, sw = 0, isVmin = false) => {
  const pathReg = /[\\\\]|[\/]/
  const pathArr = path.split(pathReg);
  const fileName = pathArr.slice(-1)[0];
  const name = fileName.split('.').slice(0, -1).join('.')
  const curPath = resolve('./')
  // const __dirname = fileURLToPath(import.meta.url)
  const fullPath = resolve(curPath, path)
  // console.log(curPath, fullPath, cwd)
  const { wxml, wxss, states, methods, components } = await compileVueFile(fullPath, compMap, px2rpx, rem2rpx, sw, isVmin)
  // debugger
  
  const createDir = () => {
    const create = (dirPath) => {
      const isExist = existsSync(dirPath)
      if (isExist) return
      mkdirSync(dirPath)
    }
    const outArr = outputPath.split(pathReg)
    outArr.reduce((cur, item, index) => {
      if (index === 0) {
        return item
      } else {
        let dirName = item
        if (index === outArr.length - 1) {
          /\.vue$/.test(dirName) && (dirName = dirName.replace(/\.vue/, ''))
        }
        const p = join(cur, dirName)
        create(p)
        return p
      }
    }, '')
    
  }
  createDir()
  const vueOutput = outputPath.replace(/.vue$/,'')
  // const wxOutName = vueOutput.split(pathReg).
  const wxFilePath = (type) => join(vueOutput, name + '.' + type)
  writeFile(wxFilePath('wxml'), wxml)
  writeFile(wxFilePath('wxss'), wxss)
  writeFile(wxFilePath('json'), wxJson(components))
  writeFile(wxFilePath('ts'), wxJs(states, methods))
}
export const tempDebug = async () => {
  createComponentFiles('D:/test/PromotionBanner.vue', null, 'D:/test/output/PromotionBanner.vue')
}
function toKebabCase(str) {
  return str.replace(/([A-Z])/g, val => '-' + val.toLowerCase()).toLowerCase();
}
/** 将vue中的style对象转换为小程序的字符串+表达式 */
export function objectStyleParse(oStr) {
  return oStr.slice(1, -1).split(',').map(i => i.trim())
  .map(kv => {
    let [k, ...vals] = kv.split(':');
    const propVals = [...vals]
    let v = propVals.join(':')
    v = v.trim()
    return `${toKebabCase(k.trim())}:{{${v}}}`
  }).join(';')
}

/**
 * 
 * @param {Set<string>} fileStates 
 */
function filterSameState(fileStates) {
  const priority = [TYPE_FUNC, TYPE_ARR, TYPE_OBJECT, TYPE_BOOL, TYPE_NUMBER, TYPE_STRING]
  const arr = []
  fileStates.forEach(state => {
    const [k, type] = state.split(':')
    const findItem = arr.find(i => i.key === k)
    if (findItem) {
      const mostPriority = Math.min(priority.indexOf(findItem.type), priority.indexOf(type))
      if (mostPriority < 0) {
        throw 'mostPriority异常'
      }
      findItem.type = priority[mostPriority]
    } else {
      arr.push({
        key: k,
        type
      })
    }
  })
  return arr.reduce((recordSet, item) => {
    recordSet.add(`${item.key}:${item.type}`)
    return recordSet
  }, new Set())
}