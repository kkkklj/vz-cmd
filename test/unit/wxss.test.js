import { test } from '@jest/globals'
import { expect } from '@jest/globals'
import { replaceUnit, wx2Vmin } from '../../utils/wxss'
test('px单位转换', () => {
  expect(replaceUnit({css:'width: 5px;'}))
  .toBe('width: 10rpx;')
})
test('px小数点', () => {
  expect(replaceUnit({css:'width: 2.5px;'}))
  .toBe('width: 5rpx;')
})
test('px小数点带0', () => {
  expect(replaceUnit({css:'width: 2.50px;'}))
  .toBe('width: 5rpx;')
})
test('rem单位转换', () => {
  expect(replaceUnit({css:'width: 0.5rem;'}))
  .toBe('width: 100rpx;')
})
test('rem小数带0', () => {
  expect(replaceUnit({css:'width: 0.220rem;'}))
  .toBe('width: 44rpx;')
})
test('vmin单位转换', () => {
  expect(wx2Vmin('width: 11.2rpx'))
  .toBe('width: 1.49vmin')
})