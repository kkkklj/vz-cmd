import { readFileSync } from 'fs';
import { compileTpl, getsfc } from './utils/wxml2.js';
import { createComponentFiles, tempDebug } from './utils/wxCompiler.js';
import { compilerVueComponents, readSomething } from './utils/batchCompiler.js';
import { batchDelBranch } from './utils/git.js';
const debugFn = () => {
  const info = readFileSync('D:/test/PromotionBanner.vue', 'utf-8')
  const sfc = getsfc(info)
  const ast = compileTpl(sfc.template.content).ast
  console.log('ast-->', ast)
  debugger
}
// debugFn()
// tempDebug()
// createComponentFiles('./PromotionBanner.wxml')
// createComponentFiles('D:/test/PromotionBanner.wxml')
// compilerVueComponents('D:/test/OnlineLottery', "market/", undefined, undefined, true)
// compilerVueComponents('D:/test/GolbalPopup.vue', "market/", undefined, undefined, true)
batchDelBranch()