#!/usr/bin/env node
import chalk from 'chalk';
import {Command} from 'commander'
import _process from "child_process"
import {$} from 'execa';

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

const gitPush = async (commit, addList = ['.']) => {
    await processExec('git add ' + addList.join(' '));
    await processExec(`git commit -m "${commit}"`);
    await processExec('git pull');
    await processExec('git push');
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
    await processExec('git checkout' + current);
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
.argument('[args...]', 'string to split')
.option('-mgt, --merge', 'use git push')
.option('--stash', 'use git stash to target branch')
.action(async (args,options) => {
    if(options.push) {
        const [commit, ...addList] = args;
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


program.command('split')
  .description('Split a string into substrings and display as an array')
  .argument('<string>', 'string to split')
  .option('--first', 'display just the first substring')
  .option('-s, --separator <char>', 'separator character', ',')
  .action((str, options) => {
    const limit = options.first ? 1 : undefined;
    console.log(str.split(options.separator, limit));
  });

program.parse();