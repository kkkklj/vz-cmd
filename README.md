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
# -mgt 合并进test和dev
vz git -mgt test dev
```

### ls 命令

#### 选项可以拼接

参数优先级根据以下选项

1. -m: 通过正则匹配过滤文件，字符串会作为js中的RegExp函数的参数传入生成正则
2. -c：复制到目标文件夹，支持相对路径