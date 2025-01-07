import { test } from '@jest/globals'
import { expect } from '@jest/globals'
import { parseObj, renderBindClass } from '../../utils/wxml'
import { objectStyleParse } from '../../utils/wxCompiler'
test('parseObj: 数组传入异常对象', () => {//其实应该在renderBindClass就处理了
  expect(parseObj('{ notext: lotteryTextShow }, liveSetup.customClassName'))
  .toBe(`{{ lotteryTextShow ? 'notext' : ''}} {{liveSetup.customClassName}}`)
})

test('renderBindClass: 数组对象转换', () => {
  expect(renderBindClass(`[{ notext: lotteryTextShow }, liveSetup.customClassName]`))
  .toBe(`{{ lotteryTextShow ? 'notext' : ''}} {{liveSetup.customClassName}}`)
})
test('renderBindClass: 数组多属性对象转换', () => {
  expect(renderBindClass(`[{ notext: lotteryTextShow, a:b }]`))
  .toBe(`{{ lotteryTextShow ? 'notext' : ''}} {{ b ? 'a' : ''}}`)
})
test('renderBindClass: 值为类名', () => {
  expect(renderBindClass(`[qwe, asd]`)).toBe(`{{qwe}} {{asd}}`)
  expect(renderBindClass(`{qwe}`)).toBe(`{{qwe}}`)
})

test('renderBindClass: 数组多条件判断', () => {
  expect(renderBindClass(`['info', {aa: A || B, bb: C && D}]`))
  .toBe(`info {{ A || B ? 'aa' : ''}} {{ C && D ? 'bb' : ''}}`)
})

test('objectStyleParse: 对象三元style', () => {
  expect(objectStyleParse(`{backgroudColor:a?'#fff':'#000'}`))
  .toBe(`backgroud-color:{{a?'#fff':'#000'}}`)
})

test('objectStyleParse: 对象值', () => {
  expect(objectStyleParse(`{backgroudColor:value}`))
  .toBe(`backgroud-color:{{value}}`)
})

test('objectStyleParse: 多条件', () => {
  expect(objectStyleParse(`{backgroudColor:a&&b||c}`))
  .toBe(`backgroud-color:{{a&&b||c}}`)
})

test('objectStyleParse: 多key', () => {
  expect(objectStyleParse(`{backgroudColor:a?'#fff':'#000',zIndex:a&&b||c,marginLeft:value}`))
  .toBe(`backgroud-color:{{a?'#fff':'#000'}};z-index:{{a&&b||c}};margin-left:{{value}}`)
})

