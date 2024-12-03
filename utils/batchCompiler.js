import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { createComponentFiles } from './wxCompiler.js'
import { writeFile } from './io.js'
export async function readSomething(path, fileBack, filterFn) {
  if (!existsSync(path)) {
    throw '路径不存在'
  }
  const isDirectory = path => {
    const stat = statSync(path)
    return stat.isDirectory()
  }
  if (isDirectory(path)){
    // 先遍历记录一次所有文件
    const recursion = (fPath, callback) => {
      const files = readdirSync(fPath)
      if (files?.length) {
        files.forEach(fileName => {
          const nextPath = join(fPath, fileName)
          if (isDirectory(nextPath)) {
            recursion(nextPath, callback)
          } else {
            callback(nextPath)
          }
        })
      }
    }
    const allFilesPath = []
    recursion(path, (filePath) => {
      allFilesPath.push(filePath)
    })
    recursion(path, (curPath) => {
      fileBack(curPath, allFilesPath)
    })
  } else {
    fileBack(path, [path])
  }
}
/**
 * 
 * @param {string} path 
 * @param {*[]} allFilesPath 
 */
export async function compilerVueComponents(path, bashUrl = '', px2rpx, rem2rpx, isFull, sw = 0) {
  const isVueFile = path => /\.vue$/.test(path)
  const isJsFile = path => /\.js/.test(path)
  readSomething(path, (curPath, allFilesPath) => {
    if (isVueFile(curPath)) {
      const components = allFilesPath.filter(isVueFile)
      // const compMap = new Map()`
      let compMap = bashUrl ? new Map() : null
      if (bashUrl === '/./') {
        bashUrl = '/'
      }
      components.forEach(comp => {
        const name = comp.match(/[0-9a-zA-Z_]+(?=\.vue)/)?.[0]
        if (name && compMap) {
          compMap.set(name, bashUrl + comp.replace(resolve('./')))
        }
      })
      curPath = curPath.replace(/^[\.\/]/, '').replace(/[\/\/|\\\\]/g, '/')
      let outputPath = join(resolve('./'), 'output', curPath)
      if (isFull) {
        const fullPath = isFull ? curPath : join(resolve('./'), curPath)
        const targetDir = path.split('/').slice(0, -1).join('/')
        outputPath = join(targetDir, 'output', fullPath.replace(targetDir, '').split('/').join('/'))
      }
      
      createComponentFiles(curPath, compMap, outputPath, px2rpx, rem2rpx, sw)
    } else if (isJsFile(curPath)) {
      writeFile(curPath, readFileSync(curPath, 'utf-8'))
    }
  })
}