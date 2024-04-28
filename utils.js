import chalk from 'chalk';
import _process from "child_process"
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
    list.forEach(async item => {
        await processExec(item.exec);
    })
}

export const commandDesc = str => console.log(chalk.bold.blue(str))