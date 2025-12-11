import { compileVueScript } from "../utils/script.js"
const defaultWxJs = `Component({
  data: {}
})`
export const wxJs = (...arg) =>  {
  try {
    if (![...arg][0]) {
      console.log('缺少script或script为setup')
      return defaultWxJs
    }
    return compileVueScript(...arg)
  } catch (error) {
    console.log('err->', error)
    return defaultWxJs
  }
}
/**
 * 
 * @param {{path:string, name: string}[]} components 
 * @returns 
 */
export const wxJson = (components) => {
  return `{
    "component": true,
    "usingComponents": {
      ${
        components.map(item => {
          let path = item.path.replace(/[\\\\]|[\\]|[\/\/]/g, '/').replace(/\.vue$/, '')
          const name = path.split('/').slice(-1)
          const nameSuffix = /\@vant/.test(item.path) ? '' : '/' + name
          return `"${item.name}": "${path + nameSuffix}"`
        }).join(',\n      ')
      }
    }
}`
}