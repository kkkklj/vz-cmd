export const wxJs = (states, methods) => `Component({

  /**
   * 组件的属性列表
   */
  properties: {

  },

  /**
   * 组件的初始数据
   */
  data: {
    ${states.map((state) => {
      let value = '""'
      if (state.type === 'array') {
        value = '[]'
      }
      if (state.type === 'object') {
        value = '{}'
      }
      if (state.type === 'number') {
        value = 0
      }
      if (state.type === 'boolean') {
        value = false
      }
      return `${state.key}: ${value},`
    }).join('\n    ')}
  },

  /**
   * 组件的方法列表
   */
  methods: {
    ${
      methods.map(({key}) => {
        return `${key}() {},`
      }).join('\n    ')
    }
  }
})`
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