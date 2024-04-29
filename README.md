# 简化命令行工具

### git 命令

vz git [options] [args...]

#### 以下选项均为互斥不可拼凑
- -ps: 会依次执行git的add、commit、pull、push命令
    - args: 默认第一个为commit内容，后续参数都为添加的文件（不填默认提交所有更改）
    - args[0]: 此参数会被校验是否符合提交规范
- --stash: 将当前分支的未提交更改迁移到另一个分支（通常是代码写错分支用的）
    - args：目标分支
- -mgt(--mergeto)：将当前分支合并到其他分支
    - args: 目标分支，可有多个
 
例子
```shell
# -ps 推送所有更改
vz git -ps "fix: 改了个bug" .
# -mgt 将当前分支合并进test和dev
vz git -mgt test dev
```
## 以下命令需要终端支持linux命令

为什么采用linux命令，应为linux命令对文件的一些处理比较灵活，例如.和没参数查询全部，0*能查询所有0开头的文件，懒得再实现一套了

### ls 命令

vz ls [-mco] [args...]

#### 选项可以拼接

参数优先级根据以下选项（需要你的终端能使用linux命令，至少得能使用ls查询文件）

1. -m: 通过正则匹配过滤文件，字符串会作为js中的RegExp函数的参数传入生成正则
2. -c：过滤后的文件复制到目标文件夹，支持相对路径
3. -o: 过滤后文件输出为js数组

```shell
# 查找蓝湖导出所有图片中的二倍图，并放到当前目录下的file文件夹
vz ls -mc "2x\\.(png|jpg)" file
```

### tiny 命令

vz tiny [-w] [args...]

用于压缩图片（需要你的终端能使用linux命令，至少得能使用ls查询文件）

1. 当参数为.或不传时，为当前目录所有图片。为具体文件名时，会按需选择对应文件
2. -w(--wait) 选项，可赋值，用于设定请求tiny接口的时间间隔（太频繁的请求会被tiny拒绝返回）

```shell
# 将当前目录下所有图片进行压缩
vz tiny
# 将当前目录下a.png,b.png进行压缩，并设置接口间隔为3秒
vz tiny -w3000 a.png b.png
# 或者
vz tiny --wait=3000 a.png b.png
```