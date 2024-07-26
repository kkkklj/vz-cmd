import { readFileSync } from 'fs';
import http from 'http'
import { compileTpl, getsfc } from './utils/wxml2.js';

//创建HTTP服务器
let app = http.createServer();

app.on("request", (req, res) => {
  //首先使用method获取求情方式
  const info = readFileSync('D:/test/PromotionBanner.wxml', 'utf-8')
  const ast = compileTpl(getsfc(info).template.content).ast
  res.end(JSON.stringify(ast))
});
app.listen(2020,function(){
	console.log('服务器已经开启,端口是2020')
})