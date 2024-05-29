#!/usr/bin/env node
import chalk from 'chalk';
import {Command} from 'commander'
import _process from "child_process"
import {$} from 'execa';
import {Regexps, api} from './config.js'
import * as utils from './utils/utils.js'
import request from './utils/request.js'
import { copyFileSync, createReadStream, createWriteStream, existsSync, readFileSync, statSync, unlink, unlinkSync, writeFileSync } from 'fs';
import { vueDirectReplace, wxmlReplace } from './utils/wxml.js';
import { scssParse } from './utils/wxss.js';
import { homedir } from 'os';
import { join } from 'path';
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
    const gitAdd = (await $`git diff --staged`).stdout;
    if (!gitAdd) {
        console.log(chalk.blue('执行add提示: 暂存区无文件。不会写入当前commit'))
    } else {
        await processExec(`git commit -m "${commit}"`);
    }
    
    await processExec('git pull');
    await processExec('git push');
    console.log(chalk.bold.green('提交成功'));
}
// main
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
// main
const gitMerge = async (target, current) => {
    const exec = utils.exec;
    await exec([
        'git checkout ' + target,
        'git pull',
        'git merge ' + current,
        'git push',
        'git checkout ' + current
    ]).catch(e => console.log(chalk.red('err:',e)))
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
    console.log(options)
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
    if(options.mergeto) {
        const currentBranch = await getGitBranch();
        for (let index = 0; index < args.length; index++) {
            const targetBranch = args[index];
            utils.commandDesc('代码合并并推送\n目标分支为:\n'+ targetBranch);
            await gitMerge(targetBranch, currentBranch);
        }
        
    }
    if(options.stash) {
        const targetBranch = args[0];
        utils.commandDesc('本地代码迁移\n目标分支为:\n'+ targetBranch);
        gitStash(targetBranch)
    }
    // console.log(options.push, options.merge, args, options.stash, options);
})





program.command('ls')
.argument('[args...]', 'args')
.option('-f, --filter','过滤文件',)//根据当前目录的配置文件
.option('-m, --match <regexp>', '匹配文件')//根据input
.option('-c, --copy', '复制文件')
.option('-o, --output', '输出为js')
.option('-h, --http', '尝试请求')
.action(async (args, options) => {
    let regular;
    let list = await utils.getFileList(args);
    if (options.match) {
        regular = RegExp(options.match);
        list = list.filter(i => regular.test(i));
    }
    if (options.copy) {
        list.forEach(name => {
            copyFileSync(`./${name}`, args[0] + '/' + name);
        })
    }
    console.log(chalk.greenBright('ls查询到的文件为:\n',list.join('\n')))
    if (options.output) {
        const str = JSON.stringify(list)
        .replace(/^\[/,'[\n  ')
        .replace(/\]$/,'\n]')
        .replaceAll(/(?<=(\"|\'))\,(?=(\"|\'))/g,",\n  ")
        const cont = `const arr = ${str}`;
        writeFileSync(`./output-${new Date().getTime()}.js`, cont);
    }
    if (options.http) {
        const baseUrl = utils.configFile.getInfo().checkUrl
        if (!baseUrl) {
            return console.log(chalk.red('未设置checkUrl，通过vz config set checkUrl="xxx"设置'))
        }
        Promise.allSettled(list.map(name => request.get(baseUrl + name)))
        .then((values) => {
            const existList = values.map((i, index) => ({
                status: i.status,
                name: list[index]
            })).filter(i => i.status === 'fulfilled').map(i => i.name)
            if (existList.length) {
                console.log(chalk.red('服务器上已存在以下文件:\n',existList.join('\n')))
            } else {
                console.log(chalk.green('检查的文件都不存在于服务器上'))
            }
        })
    }
})
// test 1

// todo -r 重新压缩上次压缩请求失败的图片
// todo --size 根据图片尺寸过滤
program.command('tiny')
.argument('[imgList...]','图片列表')
.option('-w, --wait <time>')
.action(async (imgList,options) => {
    console.log(imgList,options)
    const waittime = Number(options.wait) || 0;
    const list = (await utils.getFileList(imgList)).filter(i => Regexps.IMG.test(i));
    function getKb(byte) {
        return (byte / 1024).toFixed(1) + 'k'
    }
    const headers = {
        "referer": "https://tinypng.com/",
        "user-agent": 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36',
    }
    list.forEach((file) => {
        const _rawSize = statSync(file).size;
        let diff;
        let percent;
        request.post(api.TINY, createReadStream(file), {
            headers, responseType: 'json',
            useLimit: 1,
            waittime
        })
        .then(response => {
            let body = response.data;
            let op = body.output;
            if (!op || !op.url) {
                console.log(chalk.red(`\u2718  Something bad happend of compressing \`${file} \`: ` + body.message));
                return Promise.reject(body.message)
            }
            diff = _rawSize - op.size;
            percent = diff / _rawSize * 100;
            if (percent < 1) {
                console.log(chalk.yellow('\u2718 Couldn’t compress `' + file + '` any further'));
                return Promise.reject('warn');
            } else {
                return request.get(op.url, { responseType: 'stream' })
            }
        })
        .then(response => {
            const writer = createWriteStream(file);
            response.data.pipe(writer);
            writer.on('close', () => {
                console.log(chalk.green('\u2714 Saved ' + getKb(diff) + ' (' + percent.toFixed(2) + '%) for `' + chalk.bold(file) + '`'));
            });
            writer.on('error', error => {
                console.log(chalk.red('Error occurred while saving the compressed file: ' + error));
            });
        })
        .catch(error => {
            if (error === 'warn') {
                return
            }
            console.log(chalk.red('Error occurred while compressing the file: ' + error));
        })
    })
})

program.command('wxml')
.argument('[args...]', 'args')
.option('-h, --wxml')
.option('-v, --vue')
.action(async(args, options) => {
    let info = readFileSync(args[0], 'utf-8');
    if (options.vue) {
        info = vueDirectReplace(info)
    }
    if (options.wxml) {
        info = wxmlReplace(info)
    }
    const fileNameArr = args[0].split('.');
    const nName = fileNameArr.slice(0,-1).join('.') +'.next' +'.' + fileNameArr.slice(-1)[0]
    if (existsSync(nName)) {
        unlinkSync(nName)
    }
    writeFileSync(nName, info);
    
})

program.command('wxss')
.argument('[args...]', 'args')
.option('-p, --px2rpx <time>')
.option('-r, --rem2rpx <time>')
.action(async(args, options) => {
    console.log('options',options)
    const px2rpx = options.px2rpx || 2;
    const rem2rpx = options.rem2rpx || 200;
    scssParse(args[0], {px2rpx, rem2rpx})
})

program.command('config [type]')
.argument('[args...]', 'args')
.action(async(type, args) => {
    let info = utils.configFile.getInfo();
    if (type === 'delete') {
        args.forEach(key => info[key] && delete info[key]);
        utils.configFile.setInfo(info)
        return
    }
    if (type === 'set') {
        args.forEach(item => {
            const [key, value] = item.split('=');
            info[key] = value
        });
        utils.configFile.setInfo(info);
    }
    if (type === 'get') {
        console.log(chalk.green(JSON.stringify(info)))
    }
})


program.parse();