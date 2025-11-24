
import { readFileSync, writeFileSync } from 'fs';
import { traverse } from '@babel/core';
import { parse, types } from '@babel/core';
import generator from '@babel/generator'
export function replaceWindowZbvd(filePath) {
  // const content = readFileSync('D:/test/windowZbvd.js', 'utf-8')
  const content = readFileSync(filePath, 'utf-8')
  const ast = parse(content, {
    sourceType: 'module'
  })
  const shouldChangeToFunc = []
  traverse(ast, {
    TemplateLiteral(path) {
      if (path.node.__isDeal__) return
      let hasWindow = false
      path.scope.traverse(path.node, {
        Identifier(cPath) {
          if (cPath.node.name === 'window'){
            cPath.parentPath.replaceWith(cPath.parent.property)
            hasWindow = true
          }
        }
      })
      if (hasWindow) {
        if (path.parent.key?.name) {
          shouldChangeToFunc.push(path)
          path.parent.key.name = '_' + path.parent.key.name
        }
      }
    },
  })
  shouldChangeToFunc.forEach(path => path.replaceWith(types.arrowFunctionExpression([types.identifier('zbvd')], path.node)))
  const output = generator.default(ast);
  writeFileSync(filePath, output.code)
}
// replaceWindowZbvd()