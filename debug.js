import { readFileSync } from 'fs';
import { compileTpl, getsfc } from './utils/wxml2.js';
import { createComponentFiles, tempDebug } from './utils/wxCompiler.js';
import { compilerVueComponents, readSomething } from './utils/batchCompiler.js';
const debugFn = () => {
  const info = readFileSync('D:/test/PromotionBanner.vue', 'utf-8')
  const sfc = getsfc(info)
  const ast = compileTpl(sfc.template.content).ast
  console.log('ast-->', ast)
  debugger
}
// debugFn()
tempDebug()
// createComponentFiles('./PromotionBanner.wxml')
// createComponentFiles('D:/test/PromotionBanner.wxml')
// compilerVueComponents('D:/test/OnlineLottery')