#!/usr/bin/env node
import chalk from 'chalk';
import {Command} from 'commander'
import _process from "child_process"
import {$} from 'execa';
import {Regexps} from './config.js'
import * as utils from './utils.js'
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
    await processExec('git checkout ' + target);
    await processExec('git pull');
    await processExec('git merge ' + current);
    await processExec('git push');
    await processExec('git checkout ' + current);
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
.option('-mgt, --merge', 'use git push')
.option('--stash', 'use git stash to target branch')
.action(async (args,options) => {
    if(options.push) {
        
        const [commit, ...addList] = args;
        utils.commandDesc('代码推送，commit内容为:\n'+ commit + `\n添加内容为:\n${addList.join('\n')}`);
        gitPush(commit, [...addList])
    }
    if(options.merge) {
        const targetBranch = args[0];
        const currentBranch = await getGitBranch();
        gitMerge(targetBranch, currentBranch)
    }
    if(options.stash) {
        const targetBranch = args[0];
        gitStash(targetBranch)
    }
    console.log(options.push, options.merge, args, options.stash);
})

program.command('run')
.argument('[args...]', 'args')
.action(async (args, options) => {
    await processExec('export NODE_OPTIONS=--openssl-legacy-provider && npm run ' + args.join(' '));
})


program.parse();