import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
let config;
const homePath = homedir();
const configPath = join(homePath,'vz_cmd_config.json');
const topLevelKey = Symbol('topLevelKey');
export const configFile = {
    defaultValue: {"name": "config"},
    getInfo() {
      if (config) {
        return config;
      }
      if (!this.isExist()) {
        this.setInfo(this.defaultValue);
      }
      config = JSON.parse(readFileSync(configPath,'utf-8'));
      return config
    },
    setInfo(info) {
      writeFileSync(configPath, JSON.stringify(info));
      config = null;
    },
    isExist() {
      return existsSync(configPath)
    }
}
config = configFile.getInfo();
const handler = {
  get(target, key) {
    let ret = Reflect.get(target, key);
    if (typeof ret === 'function') {
      return new Proxy(ret.bind(target), handler);
    }
    return typeof ret === "object" ? new Proxy(ret, handler) : ret;
  },
  set(target, key, value) {
    try {
      return Reflect.set(target, key, value);
    } finally {
      configFile.setInfo(fileConfig);
    }
  },
  apply(fn, _this, args) {
    try {
      return fn.apply(_this, args) || true;
    } finally {
      configFile.setInfo(fileConfig);
    }
  },
  deleteProperty(target, propKey) {
    try {
      return delete target[propKey];
    } finally {
      configFile.setInfo(fileConfig);
    }
  }
};
export const fileConfig = new Proxy(config, handler);