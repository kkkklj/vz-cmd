import { readFileSync, writeFileSync } from 'fs';
// import * as parser from "@babel/parser";
import generator from '@babel/generator'
// import traverse from "@babel/traverse";
import { parse, traverse, types } from '@babel/core'
const methodVueDataAssignmentExpressionPathList = []
const replaceThisPathList = []
function computedCallName(name) {
  return `__computed__${name}`
}
function getThisPathNextMemberKey(path) {
  return path.getNextSibling().parent.property.name
}
/**
 * 检查当前的this是否可替换为this.data
 */
function checkThisCanReplace(path) {
  if (!path.parent.property) return false
  if (/^__computed__/.test(path.parent.property.name)) return false
  if (['setData', '$route', '$toast'].includes(path.parent.property.name)) {
    return false
  }
  return true
}
/**
 * this.xxx = xxx
 * 转换为
 * this.setData({ xxx: xxx })
 */
function assignmentExpressionToSetData(path) {
  try {
    const setDataCallNode = parse(`this.setData()`, {
      sourceType: 'script'
    }).program.body[0]
    setDataCallNode.expression.arguments.push(types.objectExpression([
      types.objectProperty(types.identifier(path.node.left.property.name), path.node.right)
    ]))
    path.replaceWith(setDataCallNode)
  } catch (error) {
    debugger
  }
}
function replaceThisToThisData(path) {
  path.replaceWith(types.memberExpression(types.thisExpression(), types.identifier('data')))
}
function compileScript() {
  const blockShouldUpdateComputedMap = new Map()
  const dataMap = new Map()
  const content = readFileSync('D:/test/scriptAst.js', 'utf-8')
  const ast = parse(content, {
    sourceType: 'module'
  });
  const scriptBody = ast.program.body
  const exportDefault = scriptBody.find(i => i.type === 'ExportDefaultDeclaration')
  if (exportDefault) {
    const exportProps = exportDefault.declaration.properties
    const lifetimesAst = types.objectProperty(types.identifier('lifetimes'), 
      types.objectExpression([types.objectMethod('method', types.identifier('attached'), [], types.blockStatement([]))])
    )
    exportProps.push(lifetimesAst)
    const vueData = exportProps.find(i => i.key.name === 'data')
    const vueComponents = exportProps.find(i => i.key.name === 'components')
    const vueMethods = exportProps.find(i => i.key.name === 'methods')
    const vueDataReturn = vueData.body.body.find(i => i.type === 'ReturnStatement')
    const vueDataReturnProps = vueDataReturn.argument.properties
    vueDataReturnProps.forEach(returnPropItem => {
      dataMap.set(returnPropItem.key.name, [])
    })
    const vueComputed = exportProps.find(i => i.key.name === 'computed')
    const methodComputed = vueComputed.value.properties.filter(i => i.type === 'ObjectMethod')
    methodComputed.forEach(node => {
      vueDataReturnProps.push(types.objectProperty(types.identifier(node.key.name), types.nullLiteral()))
    })
    // type === ThisExpression
    
    const wxData = types.objectProperty(types.identifier('data'), types.objectExpression(vueDataReturnProps))
    traverse(ast, {
      enter(path) {
        if (path.node === exportDefault) {
          path.replaceWith(types.expressionStatement(
            types.callExpression(types.identifier('Component'), [types.objectExpression(exportProps)])
          ))
        }
      }
    })
    traverse(ast, {
      enter(path) {
        if (path.node === vueData) {
          // types.objectProperty
          path.replaceWith(wxData)
        }
        if (path.node === vueComponents) {
          path.remove()
        }
      },
      ThisExpression(path) {
        if (path.findParent(path => path.node === vueComputed)) {
          if (path.findParent(path => methodComputed.includes(path.node)) && checkThisCanReplace(path)) {
            !replaceThisPathList.includes(path) && replaceThisPathList.push(path)
          }
          const computedUseVueDateKey = getThisPathNextMemberKey(path)
          const dataSubArray = dataMap.get(computedUseVueDateKey)
          if (dataSubArray) {
            const computedCallExpressionStr = `this.${computedCallName(computedUseVueDateKey)}()`
            if (dataSubArray.find(i => i.__callExpStr__ === computedCallExpressionStr)) {
              return
            }
            const computedCallAst = parse(computedCallExpressionStr, {
              sourceType: 'script'
            }).program.body[0]
            computedCallAst.__callExpStr__ = computedCallExpressionStr
            dataSubArray.push(computedCallAst)
          }   
        } else if (path.findParent(path => path.node === vueMethods)) {
          // this赋值处理，当前的path为this
          const methodVueDataAssignmentExpressionPath = path.findParent(_path => _path.node.type === 'AssignmentExpression' && _path.node.left?.property?.name === path.parent.property.name)
          if (methodVueDataAssignmentExpressionPath && methodVueDataAssignmentExpressionPath.type === 'AssignmentExpression') { 
            const methodAssignmentThisKey = getThisPathNextMemberKey(path)
            const dataSubArray = dataMap.get(methodAssignmentThisKey)
            if (dataSubArray?.length) {
              const findBlock = path.findParent(path => path.node.type === 'BlockStatement')
              /** @type {*[]} */
              let blockShouldUpdateComputed = blockShouldUpdateComputedMap.get(findBlock)
              if (!blockShouldUpdateComputed) {
                blockShouldUpdateComputed = []
                blockShouldUpdateComputedMap.set(findBlock, blockShouldUpdateComputed)
              }
              
              dataSubArray.forEach(item => {
                if (blockShouldUpdateComputed.includes(item)) return
                blockShouldUpdateComputed.push(item)
                // item.__deployExpStr__ = methodAssignmentThisKey
              })

              // const __ = methodVueDataAssignmentExpressionPath
              // const _thisPath = path
            
              // debugger
            }
            if (!methodVueDataAssignmentExpressionPathList.includes(methodVueDataAssignmentExpressionPath)) {
              methodVueDataAssignmentExpressionPathList.push(methodVueDataAssignmentExpressionPath)
            }
          }
        }
      },
      ReturnStatement(path) {
        // 替换computed的return为setData
        const methodComputedReturnsPath = path.findParent(i => methodComputed.includes(i.node))
        if (methodComputedReturnsPath) {
          if (path.node.$computedReturnIsReady) {
            return
          }
          const nReturn = types.returnStatement(
             types.callExpression(types.memberExpression(
                types.thisExpression(),
                types.identifier('setData')
              ), [
                types.objectExpression([
                  types.objectProperty(types.identifier(methodComputedReturnsPath.node.key.name), path.node.argument)
                ])
              ])
          )
          nReturn.$computedReturnIsReady = true
          path.replaceWith(nReturn)
        }
      }
    })
    blockShouldUpdateComputedMap.forEach((shouldUpdateComputed, blockStatement) => {
      const insertBeforeNodeIndex = blockStatement.node.body.findLastIndex(node => node.type !== 'ReturnStatement')
      blockStatement.node.body.splice(insertBeforeNodeIndex + 1, 0, ...shouldUpdateComputed)
    })
    methodVueDataAssignmentExpressionPathList.forEach((path) => assignmentExpressionToSetData(path))
    traverse(ast, {
      ThisExpression(path) {
        if (path.findParent(path => path.node === vueMethods) && checkThisCanReplace(path)) {
          !replaceThisPathList.includes(path) && replaceThisPathList.push(path)
        }
      }
    })
    replaceThisPathList.forEach(path => replaceThisToThisData(path))
    const attachedScope = lifetimesAst.value.properties.find(i => i.key.name === 'attached')
    methodComputed.forEach(node => {
      node.key.name = computedCallName(node.key.name)
      vueMethods.value.properties.push(node)
      const computedCallExpressionStr = `this.${node.key.name}()`
      const computedCallAst = parse(computedCallExpressionStr, {
        sourceType: 'script'
      }).program.body[0]
      attachedScope.body.body.push(computedCallAst)
      
    })
    // const vueData = [...methodProps].find(i => i.key.name === 'data')
  }


  const output = generator.default(ast);
  debugger
  writeFileSync('./tttttttt.js', output)
  debugger
}
compileScript()