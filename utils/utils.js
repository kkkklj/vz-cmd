import chalk from 'chalk';
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
/**
 * 
 * @param {string[]|any[]} commands 
 */
export const exec = async (commands) => {
    // todo
    const list = commands.map(item => {
        if (typeof item === 'string') {
            return {
                exec: item
            }
        }
        return item
    })
    for (let index = 0; index < list.length; index++) {
        const item = list[index];
        if (item.before) {
            await item.before()
        }
        await processExec(item.exec);
        if (item.after) {
            await item.after();
        }
    }
}

export const commandDesc = str => console.log(chalk.bold.blue(str))

/**
 * @param {string[]} names 
 */
export const getFileList = async (names) => {
    if(!names || !names.length) {
        names = ['.'];
    }
    const cmd = `ls ${names.map(i => (`"${i}"`)).join(' ')}`
    const ls = await $`${cmd}`; 
    return ls.stdout.split('\n');
}