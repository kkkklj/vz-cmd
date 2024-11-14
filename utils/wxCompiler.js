import { parse, compileTemplate } from '@vue/compiler-sfc'
import { readFileSync, writeFileSync, existsSync, unlinkSync, statfsSync, mkdir, mkdirSync, stat } from 'fs';
import { renderBindClass, tagMap } from './wxml.js';
import { ENUM_NODE_TYPE } from '../enum/sfc.enum.js';
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

/**
 * 
 * @param {string} path 
 * @param {Map<string, string>} compMap 
 * @returns 
 */
const compileVueFile = async (path, compMap) => {
  const info = readFileSync(path, 'utf-8')
  const sfc = getsfc(info)
  const { template, script, styles} = sfc
  const fileStates = new Set()
  
  /**
   * 
   * @param {string} state 
   * @param {boolean} checkBool 
   */
  function recordState(state, checkBool) {
    let type = TYPE_STRING
    const varReg = /^[0-9a-zA-Z_]+/
    const firstVar = state.match(varReg)
    const record = () => {
      const pState = state.match(varReg)?.[0]
      if (pState) {
        fileStates.add(`${pState}:${type}`)
      }
    }
    if (checkBool) {
      if (state === firstVar || state === ('!' + state)) {
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
        if (properFnName) {
          const checkType = obj => Object.hasOwn(obj.prototype, properFnName)
          if (checkType(String)) {
            type = TYPE_STRING
          } else if (checkType(Number)) {
            type = TYPE_NUMBER
          }
        }
      }
      if (isExec) {
        type = TYPE_FUNC
      }
      if (isArray) {
        type = TYPE_ARR
      }
      record()
    }
  }
  /**
   * 
   * @param {string} key 
   */
  function recerdStateByType(key, type) {
    if (type === TYPE_FUNC) {
      if (/\./.test(key)) return
      if (/\$emit/.test(key)) return
    }
    if (type === TYPE_ARR) {
      key = key.split('.')[0]
    }
    fileStates.add(`${key}:${type}`)
  }
  const compileTemplate2Wxml = () => {
    
    function renderProps(props, originTagName) {
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
        return model(prop) + 
        propFor(prop) +
        propForKey(props, prop) + 
        propStaticAttr(prop) +
        propDyAttr(prop) +
        propShow(prop) + 
        propIf(prop) + 
        propEvent(prop)
      }).join(' ')
      const setOriginTag = (classValue) => {
        return originTagName ? `${originTagName} ${classValue}` : classValue
      }
      const classAttr = classValue ? `class="${setOriginTag(classValue)}"` : ''
      attrs = classAttr + (attrs ? ' ' : '') + attrs
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
      return prop.exp.content
    }
    function propBindKey(prop) {
      if (prop.arg) {
        return prop.arg.content
      }
      return prop.name
    }
    function model(prop) {
      if (!prop.name !== 'model') return ''
      const value = propCont(prop)
      recordState(value)
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
      recerdStateByType(value, TYPE_FUNC)
      return `${prefix}${evMap[key] || key}="${value}"`
    }
    function propIf(prop) {
      // proptype 7
      if (!['if', 'else-if'].includes(prop.name)) return ''
      let key = 'if'
      if (prop.name === 'else-if') {
        key = 'elif'
      }
      const value = propCont(prop)
      recordState(value, true)
      return `wx:${key}="{{${value}}}"`
    }
    function propShow(prop) {
      // proptype 7
      if (prop.name !== 'show') return ''
      const value = propCont(prop)
      recordState(value, true)
      return `hidden="{{!(${value})}}"`
    }
    function propFor(prop) {
      // proptype 7
      if (prop.name !== 'for') return ''
      const { forParseResult } = prop
      const setAttr = (beforeStr, val) => val ? ` ${beforeStr}="${val}"` : ''
      const value = forParseResult?.value?.content
      const index = forParseResult?.key?.content
      const list = forParseResult.source.content
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
    function propDyAttr(prop) {
      // proptype 7
      if (prop.name !== 'bind') return ''
      if (prop.rawName === ':key') return ''
      const value = propCont(prop)
      recordState(value)
      return `${propBindKey(prop)}="{{${value}}}"`
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
    
    /**
     * @param {typeof sfc.template.ast.children[0]} node 
     */
    const nodeCompiler = (node) => {
      const tag = node.tag
      /** @type {*[]} */
      const props = node.props
      const tagName = tagMap[tag] || tag
      let attrs = renderProps(props, tag)
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
        recordState(state)
        return `{{${state}}}`
      }
      const temp = (childs) => {
        return `${space}<${tagName}${attrs}>${childs}</${tagName}>`
      }
      return temp(
        node.children?.length 
        ? node.children.map(childNode => nodeCompiler(childNode)).join('\n')
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
    const output = await compileScss(style.content)
    wxss += output +'\r\n'
  }
  const wxml = compileTemplate2Wxml()
  const states = []
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
    components.forEach(name => {
      const path = compMap.get(name)
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
export const createComponentFiles = async (path, compMap, outputPath) => {
  const pathReg = /[\\\\]|[\/]/
  const pathArr = path.split(pathReg);
  const fileName = pathArr.slice(-1)[0];
  const name = fileName.split('.').slice(0, -1).join('.')
  const curPath = resolve('./')
  // const __dirname = fileURLToPath(import.meta.url)
  const fullPath = resolve(curPath, path)
  // console.log(curPath, fullPath, cwd)
  const { wxml, wxss, states, methods, components } = await compileVueFile(fullPath, compMap)
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
  // const { wxml, wxss} = await compileVueFile('D:/test/PromotionBanner.vue')
  // const output = 'D:/test/PromotionBanner.next.wxml'
  // writeFile(output, wxml)
  // const wxssOutput = `D:/test/PromotionBanner.next.wxss`
  // writeFile(wxssOutput, wxss)
}

