#!/usr/bin/env node
import chalk from 'chalk';
import {Command} from 'commander'
import _process from "child_process"
import {$} from 'execa';
import {Regexps, api} from './config.js'
import * as utils from './utils/utils.js'
import request from './utils/request.js'
import { copyFileSync, createReadStream, createWriteStream, existsSync, readFileSync, statSync, unlink, unlinkSync, writeFileSync } from 'fs';
import { wxml2Compiler } from './utils/wxml.js';
import { scssParse } from './utils/wxss.js';
import { homedir } from 'os';
import { join } from 'path';
import { fileConfig } from './utils/fileConfig.js';
import { KEYS_STAGED } from './enum/configKey.js';
import { wxml3Compiler } from './utils/wxml2.js';
import { createComponentFiles } from './utils/wxCompiler.js';
import { compilerVueComponents } from './utils/batchCompiler.js';
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
.option('--loop', '失败就一直提交，github被墙的情况')
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
        const loopPush = async () => {
            try {
                await gitPush(commit, [...addList])
            } catch (error) {
                console.log(chalk.red('提交失败，再次尝试'))
                loopPush()
            }
        }
        if (options.loop) {
            loopPush()
        } else {
            gitPush(commit, [...addList])
        }
        
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

/** 
 * @todo -r 重新压缩上次压缩请求失败的图片
 */
program.command('tiny')
.argument('[imgList...]','图片列表')
.option('-w, --wait <time>')
.option('-m, --minSize <size>','最小尺寸限制,单位kb')
.option('-r, --restart','上次失败的图片重新上传')
.action(async (imgList,options) => {
    const minSize = options.minSize ? options.minSize : 0;
    const waittime = Number(options.wait) || 0;
    let list = [];
    if (options.restart) {
        if (fileConfig[KEYS_STAGED.tinyFailHistory]?.length) {
            list = fileConfig[KEYS_STAGED.tinyFailHistory];
        } else {
            return console.log(chalk.yellow('缓存为空'))
        }
    } else {
        list = (await utils.getFileList(imgList))
    }
    list.filter(i => Regexps.IMG.test(i))
    .filter(file => statSync(file).size >= minSize * 1024);
    function getKb(byte) {
        return (byte / 1024).toFixed(1) + 'k'
    }
    const headers = {
        "referer": "https://tinypng.com/",
        "user-agent": 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36',
    }
    fileConfig[KEYS_STAGED.tinyFailHistory] = [];
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
            fileConfig[KEYS_STAGED.tinyFailHistory].push(file);
            console.log(chalk.red('Error occurred while compressing the file: ' + error));
        })
    })
})
program.command('wxml')
.argument('[args...]', 'args')
.option('-t, --template')
.option('-c, --classTag', 'class中包含tag名称')
.action(async(args, options) => {
    let info = readFileSync(args[0], 'utf-8');
    if (options.template) {
        info = `<template>${info}</template>`
    }
    info = wxml2Compiler(info, options.classTag);
    const fileNameArr = args[0].split('.');
    const nName = fileNameArr.slice(0,-1).join('.') +'.next' +'.' + fileNameArr.slice(-1)[0]
    if (existsSync(nName)) {
        unlinkSync(nName)
    }
    writeFileSync(nName, info);
})
program.command('wxml3')
.argument('[args...]', 'args')
.option('-c, --classTag', 'class中包含tag名称')
.action(async(args, options) => {
    let info = readFileSync(args[0], 'utf-8');
    // if (options.template) {
    //     info = `<template>${info}</template>`
    // }
    info = wxml3Compiler(info, options.classTag);
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

/**
 * @todo 存储命令行 .bashrc部分处理
 */
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

program.command('npm [type]')
.on('-h, --help', args => {
    return '1'
})
.option('-r, --registry <registry>',`
[
    'https://registry.npmjs.org/',  //官方
    'https://registry.npmmirror.com', // 淘宝
    'https://npm.aliyun.com',   //阿里
    'https://mirrors.cloud.tencent.com/npm/',
    'https://mirrors.ustc.edu.cn/'
][index]

ex: vz npm -r0
`)
.action(async(type, options) => {
    const registry = [
        'https://registry.npmjs.org/',  //官方
        'https://registry.npmmirror.com', // 淘宝
        'https://npm.aliyun.com',   //阿里
        'https://mirrors.cloud.tencent.com/npm/',
        'https://mirrors.ustc.edu.cn/'
    ]
    if (type === 'publish') {
        const _registry = await utils.execShell('npm config get registry');
        const isOfficial = _registry === registry[0]
        try {
            console.log(chalk.bgBlue('原镜像为：',_registry));
            
            if (!isOfficial) {
                console.log(chalk.bgGray('检测到镜像非官方，切换为官方镜像推送'));
                await $`npm config set registry ${registry[0]}`;
            }
            await $`npm publish`;
            if (!isOfficial) {
                await $`npm config set registry ${_registry}`;
            }
            console.log(chalk.green('推送成功' + (isOfficial ? '' : '，切换为原镜像')))
            return
        } catch (error) {
            if (!isOfficial) {
                await $`npm config set registry ${_registry}`;
            }
            console.log(chalk.red('推送失败' + (isOfficial ? '' : '，切换为原镜像')))
            console.log(error)
        }
    }
    if(options.registry) {
        const _set = registry[options.registry]
        await $`npm config set registry ${_set}`;
        return console.log(chalk.green('设置镜像成功，当前镜像为：' + _set))
    }
    return console.log(chalk.red('未知命令'))
})

program.command('test')
.argument('[args...]', 'args')
.option('-d, --delete <prop>')
.action((args, options) => {
    if (options.delete) {
        delete fileConfig[options.delete]
    } else {
        fileConfig.a = args[0]
    }
    
})

/**
 * 自用
 */
program.command('iconfont')
.action(async () => {
    const targetPath = fileConfig.userliveIconfontPath;
    try {
        await $`rm ${targetPath}/*`;
    } catch(e) {
        console.log(chalk.red(e))
    } finally {
        $`cp ./* ${targetPath}/`;
    }
    
})

program.command('wx')
.argument('[args...]', 'args')
.action(async(args) => {
    // createComponentFiles(args[0])
    compilerVueComponents(args[0])
})
program.parse();