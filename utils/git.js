import { $ } from "execa"
import chalk from "chalk"
import { writeFileSync } from "fs"
import * as utils from '../utils/utils.js'
const three_month = 7776000000
export const batchDelBranch = async (delBef = new Date().getTime() - 1000 * 60 * 5) => {
  if (delBef > (new Date().getTime() - three_month)) {
    return console.log(chalk.red('删除的时间节点不能在最近90天内'))
  }
  const result = await $`git branch -a`
  const list = result.stdout.split(/\n|\r/).map(i => i.trim())
  /**
   * @type {{
   *  name:string
   *  timeStamp: number
   * }[]}
   */
  const delList = []
  for (let index = 0; index < list.length; index++) {
    const name = list[index];
    if (/^\*/.test(name) || /^remotes\/origin\/HEAD/.test(name) || /^(master|remotes\/origin\/master)$/.test(name)) continue
    const time = (await $`git log ${name} -1 --format="%at"`).stdout
    const timeStamp = Number(time.replace(/^("|')/, '').replace(/("|')$/,'')) * 1000
    if (timeStamp < delBef) {
      delList.push({
        name,
        timeStamp
      })
    }
  }
  console.log('所有分支数量：',list.length)
  console.log('删除分支数量：',delList.length)
  writeFileSync(`./del-branch-${delBef}.json`, JSON.stringify(delList.map(item => {
    return {
      ...item,
      lastCommit: `${new Date(item.timeStamp).getFullYear()}-${new Date(item.timeStamp).getMonth() + 1}-${new Date(item.timeStamp).getDate()}`
    }
  })))
  for (let index = 0; index < delList.length; index++) {
    const element = delList[index];
    if (/^remotes\//.test(element.name)) {
      let [originName] = element.name.match(/(?<=(remotes\/))[a-zA-Z0-9]+\//) || []
      if (!originName) continue
      originName = originName.replace(/\/$/,'')
      const remoteName = element.name.replace(RegExp(`^remotes\\/${originName}\\/`), '')
      if (remoteName === 'master') continue
      await $`git push ${originName} -d ${remoteName}`
    } else {
      await $`git branch -D ${element.name}`
    }
  }
}

export const batchCreateBranch = async () => {
  const list = Array.from({
    length: 10
  }, (n,i) => {
    return i + '' + i
  })
  for (let index = 0; index < list.length; index++) {
    const name = list[index];
    await $`git checkout -b ${name}`
    await $`git push --set-upstream origin ${name}`
  }
  $`git checkout master`
}
/** 校验当前分支合并是否合法
 * 非法合并：
 * test、dev、pre -> 任意分支
 */
export const validMergeBranch = (currentBranch, targetBranch) => {
  if (['test', 'dev', 'pre'].includes(currentBranch)) {
    throw `非法合并: ${currentBranch} -> ${targetBranch}`
  }
}

export async function getGitBranch() {
  const _version = await $`git --version`;
  const _v = _version.stdout;
  const [Ver] = _v.match(/(?<=.*?)[0-9]*(?=\.)/);
  const [v] = _v.match(/(?<=.*[0-9]*\.)[0-9]*/);
  if (Number(Ver) < 2 || (Number(Ver) >=2 && Number(v) < 22)) {
      console.log(chalk.bold.red('err: git版本太低,请升级到2.22以上版本'));
      throw 'git版本太低';
  }
  const branch = await $`git branch --show-current`;
  return branch.stdout;
}

export const gitMerge = async (target, current) => {
  validMergeBranch(current, target)
  const exec = utils.exec;
  await exec([
      'git checkout ' + target,
      'git pull',
      'git merge ' + current,
      'git push',
      'git checkout ' + current
  ]).catch(e => console.log(chalk.red('err:',e)))
}