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
export async function compilerVueComponents(path) {
  const isVueFile = path => /\.vue$/.test(path)
  const isJsFile = path => /\.js/.test(path)
  // console.log(resolve('./'), process.cwd())
  // return
  readSomething(path, (curPath, allFilesPath) => {
    if (isVueFile(curPath)) {
      const components = allFilesPath.filter(isVueFile)
      const compMap = new Map()
      components.forEach(comp => {
        const name = comp.match(/[0-9a-zA-Z_]+(?=\.vue)/)?.[0]
        if (name) {
          compMap.set(name, comp.replace(resolve('./')))
        }
      })
      const outputPath = join(resolve('./'), 'output', curPath.replace(resolve('./')))
      createComponentFiles(curPath, compMap, outputPath)
    } else if (isJsFile) {
      writeFile(curPath, readFileSync(curPath, 'utf-8'))
    }
  })
}