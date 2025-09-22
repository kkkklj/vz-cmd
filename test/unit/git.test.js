import { test } from '@jest/globals'
import { expect } from '@jest/globals'
import { gitMerge } from '../../utils/git'
test('分支合并检查', async () => {
  try {
    await gitMerge('me/feat/my-branch', 'dev')
  } catch (error) {
    expect(error).toMatch('非法合并: dev -> me/feat/my-branch')
  }
})