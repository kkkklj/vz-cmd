import { readFileSync, writeFileSync } from 'fs';
// import * as parser from "@babel/parser";
import generator from '@babel/generator'
// import traverse from "@babel/traverse";
import { parse, traverse, types } from '@babel/core'
const vueDataAssignmentExpressionPathList = []
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
function checkThisCanReplace(path, whiteList) {
  if (!path.parent.property) return false
  if (whiteList && whiteList.includes(path.parent.property.name)) return false
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
function getObjKeys(node) {
  return node.value.properties.map(node => node.key.name)
}
// 检查当前的path是否vue里的为this.xxx = xxx里的this
function checkIsVueDataAssignmentForThisPath(path) {
  const thisAssignmentExpressionPath = path.findParent(_path => _path.node.type === 'AssignmentExpression'
    && _path.node.left?.property?.name === path.parent.property.name
    && _path.node.left?.object?.type === 'ThisExpression'
  )
  if (thisAssignmentExpressionPath && thisAssignmentExpressionPath.type === 'AssignmentExpression') {
    return thisAssignmentExpressionPath
  }
  return null
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
    const vueCreatedHook = exportProps.find(i => i.key.name === 'created')
    const vueDataReturn = vueData.body.body.find(i => i.type === 'ReturnStatement')
    const vueDataReturnProps = vueDataReturn?.argument?.properties
    const vueDataWatcher = new VueDataWatcher(vueDataReturnProps)
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
          if (path.findParent(path => methodComputed.includes(path.node)) && checkThisCanReplace(path, getObjKeys(vueMethods))) {
            !replaceThisPathList.includes(path) && replaceThisPathList.push(path)
          }
          vueDataWatcher.listenVueDataChangeInComputed(path)
        } else if (path.findParent(path => [vueMethods, vueCreatedHook].includes(path.node))) {
          // this赋值处理，当前的path为this
          const thisAssignmentExpressionPath = checkIsVueDataAssignmentForThisPath(path)
          if (thisAssignmentExpressionPath) { 
            vueDataWatcher.vueDataUpdate(path)
            if (!vueDataAssignmentExpressionPathList.includes(thisAssignmentExpressionPath)) {
              vueDataAssignmentExpressionPathList.push(thisAssignmentExpressionPath)
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
    vueDataWatcher.mountedShouldUpdateCallAst()
    vueDataAssignmentExpressionPathList.forEach((path) => assignmentExpressionToSetData(path))
    traverse(ast, {
      ThisExpression(path) {
        if (path.findParent(path => [vueCreatedHook, vueMethods].includes(path.node)) && checkThisCanReplace(path, getObjKeys(vueMethods))) {
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
class VueDataWatcher {
  constructor(vueDataReturnProps) {
    this.vueDataUpdateBlock = new Map()
    this.vueDataSubscribeMap = new Map()
    this.blockShouldCallMap = new Map()
    vueDataReturnProps.forEach(returnPropItem => {
      this.vueDataSubscribeMap.set(returnPropItem.key.name, [])
    })
  }
  /**
   * 
   * @param {NodePath<types.Node>} path 
   * @param {'computed'} type 
   */
  listenVueDataChangeInComputed(thisPath) {
    let useVueDataKey = getThisPathNextMemberKey(thisPath)
    const isBindName =  computedCallName(useVueDataKey)
    const vueDataScribeList = this.vueDataSubscribeMap.get(useVueDataKey)
    if (vueDataScribeList) {
      if (vueDataScribeList.find(i => i.__uniKey__ === isBindName)) return
      const callExpressionStr = `this.${isBindName}()`
      const callAst = parse(callExpressionStr, {
        sourceType: 'script'
      }).program.body[0]
      callAst.__uniKey__ = isBindName
      vueDataScribeList.push(callAst)
    }
  }
  /**
   * 修改vue data时
   */
  vueDataUpdate(thisPath) {
    const vueDataAssignmentExpressionPath = thisPath.findParent(_path => _path.node.type === 'AssignmentExpression'
      && _path.node.left?.property?.name === thisPath.parent.property.name
      && _path.node.left?.object?.type === 'ThisExpression'
    )
    // 赋值表达式
    if (vueDataAssignmentExpressionPath && vueDataAssignmentExpressionPath.type === 'AssignmentExpression') {
      // 赋值的data key
      const assignmentKey = getThisPathNextMemberKey(thisPath)
      const vueDataScribeList = this.vueDataSubscribeMap.get(assignmentKey)
      // 有订阅了vue data的才需要更新
      if (vueDataScribeList?.length) {
        const curBlock = thisPath.findParent(path => path.node.type === 'BlockStatement')
        /** @type {*[]} */
        let shouldCallAstList = this.blockShouldCallMap.get(curBlock)
        if (!shouldCallAstList) {
          shouldCallAstList = []
          this.blockShouldCallMap.set(curBlock, shouldCallAstList)
        }
        vueDataScribeList.forEach(callAst => {
          if (shouldCallAstList.includes(callAst)) return
          shouldCallAstList.push(callAst)
        })
      }
    }
  }
  /**
   * 挂载刷新的computed等方法
   */
  mountedShouldUpdateCallAst() {
    this.blockShouldCallMap.forEach((shouldBeCallAstList, blockStatement) => {
      const insertBeforeNodeIndex = blockStatement.node.body.findLastIndex(node => node.type !== 'ReturnStatement')
      blockStatement.node.body.splice(insertBeforeNodeIndex + 1, 0, ...shouldBeCallAstList)
    })
  }
}
compileScript()

