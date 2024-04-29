import axios from 'axios'
const pendings = [];
const waitings = [];
let limit = 1;
const reqLimit = (option) => {
    const last = pendings[pendings.length - 1];
    const limitTag = last ? last + 1 : new Date().getTime()
    option.limitTag = limitTag;
    if(pendings.length < limit) {
        pendings.push(limitTag);
        return option
    }
    return new Promise((resolve) => {
        waitings.push(() => {
            const waittime = option.waittime || 0;
            setTimeout(() => {
                pendings.push(limitTag);
                resolve(option)
            }, waittime);
        });
    })
}
const resLimit = (option) => {
    if(option.limitTag) {
        const _find = pendings.findIndex(i => i === option.limitTag);
        if(_find > -1) {
            pendings.splice(_find,1);
            const next = waitings.shift();
            next && next();
        }
    }
}
const request = axios.create({
  timeout: 10000,
})
request.interceptors.request.use((config) => {
  if(config.useLimit) {
    return reqLimit(config);
  }
  return config
})
request.interceptors.response.use(
  (res) => {
    resLimit(res.config);
    return res
  },
  (error) => {
    resLimit(error.config);
    // 对响应错误做点什么
    return Promise.reject(error)
  }
)

export default request