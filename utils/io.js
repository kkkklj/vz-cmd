import { existsSync, statfsSync, unlinkSync, writeFileSync } from 'fs';
/**
 * 读取路径信息
 * @param {string} path 路径
 */
export function dirExist(path){
    try {
        statfsSync(path)
        return true
    } catch (error) {
        return false
    }
}
export const writeFile = (output, content) => {
    try {
        if (existsSync(output)) {
            unlinkSync(output)
          }
          writeFileSync(output, content)
    } catch (error) {
        console.log('err', output)
    }
  }