import { traverse } from '@babel/core';
import { parse, types, } from '@babel/core';
import generator from '@babel/generator'
import { readFileSync, writeFileSync } from 'fs';
const UNKNOWN = 'unknown'
const vzanlivemobileMap = {
  'LIVEAUTH_URI': 'liveauthHost',
  'SHOP_URL': 'shopUrl',
  'HOMEMINIURI': 'marketing',
  'FIXUP_URL': 'fixupApi',
  'MARKET_URL': 'marketApiUrl',
  'SUBSCRIBE_URI': 'gateWay',
  'USER_URL': 'liveapi',
  'LIVE_GW_URL': 'liveGwUrl',
  'LIVE_MAIN': 'livemain',
  'LIVE_MEETING_URL': 'meetingBase',
  'LIVE_INTERFACE_URL': 'liveInterface',
  'ZHIBO_URL': 'liveCapi',
  'LIVE_PALY_URL': 'livePlayUrl',
  'BILL_URL': 'orderHost',
  'BILL_API_URL': 'orderHost',
  'LIVEPAY_URL': 'livepay',
  'SCRM_URL': UNKNOWN,
  'LIVE_API': 'liveapi',
  'YWSINK_API': 'ywsink',
  'LIVE_STREAM': 'liveStream',
  'ZHIBO_API': UNKNOWN,
  'WechatApp': 'wechatapp',
  'gwServer': UNKNOWN,
  'GUO_KE_URL': UNKNOWN,
  'VZAN_STORE_BASE_URL': 'liveGwUrl',
  'FRONT_URL': 'webhost',
  'PERM_GW_URL': UNKNOWN,
  'TRIAL_URL': UNKNOWN,
  'STORE_PC_URL': UNKNOWN,
  'WX_API': 'host',
  'NOTIFY': UNKNOWN,
  'liveMarketApi': UNKNOWN,
  'wxHost': 'webhost',
  'liveGwRetry': 'liveGwRetry'
}
/**
 * 
 * @param {NodePath<types.CallExpression>} path 
 */
function transferFunctionAst(path) {
  try {
    /** @type {types.CallExpression} */
    const node = path.node
    const requestMethod = node.callee.name
    if (['get', 'post'].includes(requestMethod)) {
      node.callee.name = 'ajax'
      const requestPath = node.arguments[0]
      if (requestPath && requestPath.type === 'TemplateLiteral') {
        
      }
      let requestParams = node.arguments[1]
      if (requestParams.type === 'CallExpression') {
        console.log(`已对qs参数进行转换-->`)
        requestParams = requestParams.arguments[0]
      }
      // const showLoading = node.arguments[2]
      const requestOptions = node.arguments[3]
      if (!node.arguments || !node.arguments.length) {
        debugger
      }
      const nextArgs = [requestPath, requestParams, types.identifier(requestMethod)]
      if (requestOptions) {
        nextArgs.push(requestOptions)
      }
      node.arguments = nextArgs
    }
  } catch (error) {
    const _ = path
    debugger
  }
}
function transferBaseUrlAst(path) {
  const importSpecifiers = path.node.specifiers.map(spec => {
    return {
      local: spec.local.name,
      imported: spec.imported.name
    }
  })
  console.log('importSpecifiers-->', importSpecifiers)
  const vzanliveImport = types.importDeclaration(
    importSpecifiers.map(item => {
      let vzanliveName = vzanlivemobileMap[item.imported]
      if (!vzanliveName || vzanliveName === UNKNOWN) {
        console.log('修改baseUrl的import出现问题，vzanlive的host不存在对应的映射', item.imported)
        vzanliveName = item.imported
      }
      return types.importSpecifier(types.identifier(item.local), types.identifier(vzanliveName))
    })
  , types.stringLiteral('~/ugglive/etc/hosts'))
  return vzanliveImport
}
function transferImportFetchMethod(path) {
  const vzanliveFetchShouldImport = [
    types.importDefaultSpecifier(types.identifier('ajax'))
  ]
  if (path.node.specifiers.find(i => i.imported?.name === 'retryAjax')) {
    vzanliveFetchShouldImport.push(types.importSpecifier(types.identifier('retryAjax'), types.identifier('retryAjax')))
  }
  if (path.node.specifiers.find(i => i.imported?.name === 'createCacheAjax')) {
    vzanliveFetchShouldImport.push(types.importSpecifier(types.identifier('createCacheAjax'),types.identifier('createCacheAjax')))
  }
  const vzanliveFetchImport = types.importDeclaration(
    vzanliveFetchShouldImport, types.stringLiteral('~/api/xhr')
  )
  return vzanliveFetchImport
}
export function compileXhr(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const ast = parse(content, {
    sourceType: 'module'
  });
  traverse(ast, {
    CallExpression(path) {
      if (['get', 'post'].includes(path.node.callee.name)) {
        transferFunctionAst(path)
      }
    },
    ImportDeclaration(path) {
      if (path.node.source.value.includes('/baseUrl')) {
        const vzanliveImportAst = transferBaseUrlAst(path, ast)
        path.replaceWith(vzanliveImportAst)
      }
      if (path.node.source.value.includes('/http/http')) {
        path.replaceWith(transferImportFetchMethod(path))
      }
      if (path.node.source.value === 'qs') {
        path.remove()
      }
    }
  })
  const output = generator.default(ast);
  writeFileSync(filePath, output.code)
}