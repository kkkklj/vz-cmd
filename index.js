#!/usr/bin/env node
import chalk from 'chalk';
import {Command} from 'commander'
import _process from "child_process"
import {$} from 'execa';
import {Regexps} from './config.js'
import * as utils from './utils.js'
import path from "path";
import { copyFileSync, writeFileSync } from 'fs';
const processExec = (cmd) => {
    return new Promise((resolve,reject) => {
        _process.exec(cmd, (error, stdout, stderr) => {
            if (!error) {
              resolve()
            } else {
              reject(error)
            }
          })
    })
}
const program = new Command();
program
  .version('0.0.1')
  .description('A cli application named pro');

const gitPush = async (commit, addList) => {
    if (!addList || !addList.length) {
        addList = ['.']
    }
    if (!Regexps.GITNORMS.test(commit)) {
        console.log(chalk.bold.red('err: git commit 不符合开发规范'));
        console.log(chalk.bold.yellow('type 参考如下,注意空格'));
        console.log(chalk.bold.blue('feat: 新功能（feature）'));
        console.log(chalk.bold.blue('fix: 修补bug'));
        console.log(chalk.bold.black('docs: 文档（documentation）'));
        console.log(chalk.bold.black('style: 格式（不影响代码运行的变动）'));
        console.log(chalk.bold.black('refactor: 重构（即不是新增功能，也不是修改bug的代码变动）'));
        console.log(chalk.bold.black('test: 增加测试'));
        console.log(chalk.bold.black('chore: 构建过程或辅助工具的变动'));
        return '规范错误'
    }
    await processExec('git add ' + addList.join(' '));
    const gitAdd = await $`git diff --staged`;
    console.log('gitadd-->', gitAdd.stdout)
    await processExec(`git commit -m "${commit}"`);
    await processExec('git pull');
    await processExec('git push');
    console.log(chalk.bold.green('提交成功:commit=' + commit));
}

async function getGitBranch() {
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

const gitMerge = async (target, current) => {
    const exec = utils.exec;
    await exec([
        'git checkout ' + target,
        'git pull',
        'git merge ' + current,
        'git push',
        'git checkout ' + current
    ])
}
//
const gitStash = async (target) => {
    await processExec('git add .');
    await processExec('git stash');
    await processExec('git checkout ' + target);
    await processExec('git stash pop');
}

program.command('git')
.option('-ps, --push', 'use git push')
.argument('[args...]', 'args')
.option('-mgt, --mergeto', 'use git push')
.option('--stash', 'use git stash to target branch')
.action(async (args,options) => {
    if (!Object.keys(options).length) {
        console.log(chalk.red('缺少必填选项'));
        return
    }
    if(options.push) {
        const [commit, ...addList] = args;
        const isAll = '所有文件'
        const addContents = addList.length > 1 
        ? addList.join('\n') 
        : (!addList.length || addList [0] === '.')
        ? isAll
        : addList[0];
        utils.commandDesc('代码推送\ncommit为:\n'+ commit);
        console.log(chalk.bold.green(`添加文件有:\n${addContents}`))
        gitPush(commit, [...addList])
    }
    if(options.merge) {
        for (let index = 0; index < args.length; index++) {
            const targetBranch = args[index];
            utils.commandDesc('代码合并并推送\n目标分支为:\n'+ targetBranch);
            const currentBranch = await getGitBranch();
            await gitMerge(targetBranch, currentBranch)
        }
        
    }
    if(options.stash) {
        const targetBranch = args[0];
        utils.commandDesc('本地代码迁移\n目标分支为:\n'+ targetBranch);
        gitStash(targetBranch)
    }
    // console.log(options.push, options.merge, args, options.stash, options);
})



const getFileList = async () => {
    const ls = await $`ls`;
    return ls.stdout.split('\n')
}


program.command('ls')
.argument('[args...]', 'args')
.option('-f, --filter','过滤文件',)//根据当前目录的配置文件
.option('-m, --match', '匹配文件')//根据input
.option('-c, --copy', '复制文件')
.option('-o, --output', '输出为js')
.action(async (args, options) => {
    console.log('options-->',options)
    let regular;
    let list = await getFileList();
    if (options.match) {
        regular = RegExp(args[0]);
        list = list.filter(i => regular.test(i));
    }
    if (options.copy) {
        list.forEach(name => {
            copyFileSync(`./${name}`, args[1] + '/' + name);
        })
    }
    if (options.output) {
        const str = JSON.stringify(list)
        .replace(/^\[/,'[\n  ')
        .replace(/\]$/,'\n]')
        .replaceAll(/(?<=(\"|\'))\,(?=(\"|\'))/g,",\n  ")
        const cont = `const arr = ${str}`;
        writeFileSync(`./output-${new Date().getTime()}.js`, cont);
    }
    // console.log('match->', list.filter(i => regular.test(i)));
})

program.parse();