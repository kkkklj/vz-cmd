import { $ } from "execa"
import chalk from "chalk"
import { writeFileSync } from "fs"
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