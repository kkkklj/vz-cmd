import { $ } from "execa"
import _process from "child_process"
export const batchDelBranch = async () => {
  const cmd = `git for-each-ref --sort=-committerdate --format='%(refname:short) %(committerdate:iso)' | grep 2024`
  const result = await $`git for-each-ref --sort=-committerdate --format='%(refname:short) %(committerdate:iso)' | grep 2024`
  const list = result.stdout
  const gg = await $`git status`
  console.log('list-->', result)
}