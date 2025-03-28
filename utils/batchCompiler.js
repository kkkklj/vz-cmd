import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { createComponentFiles } from './wxCompiler.js'
import { writeFile } from './io.js'
import { wx2Vmin } from './wxss.js'
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
export async function compilerVueComponents(path, bashUrl = '', px2rpx, rem2rpx, isFull, sw = 0, isVmin = false) {
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
      createComponentFiles(curPath, compMap, outputPath, px2rpx, rem2rpx, sw, isVmin)
    } else if (isJsFile(curPath)) {
      writeFile(curPath, readFileSync(curPath, 'utf-8'))
    }
  })
}

export async function batchVmim(path) {
  readSomething(path, (curPath, allFilesPath) => {
    const pathReg = /[\\\\]|[\/]/
    let outputPath = join(resolve('./'), curPath)
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
            return
          }
          const p = join(cur, dirName)
          create(p)
          return join(cur, dirName)
        }
      }, '')
      
    }
    // createDir()
    const info = readFileSync(resolve(resolve('./'), curPath), 'utf-8');
    if (/(\.wxss|\.scss)$/.test(curPath)) {
      writeFile(outputPath, wx2Vmin(info))
    } 
  })
}