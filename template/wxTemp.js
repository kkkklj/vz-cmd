import { compileVueScript } from "../utils/script.js"

export const wxJs = (scriptText) =>  compileVueScript(scriptText)
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