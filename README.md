# 命令行工具

安装：npm i -g vz-cmd

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
- --loop 失败就一直推送，直到成功（github被墙的情况） 

例子
```shell
# -ps 推送所有更改
vz git -ps "fix: 改了个bug" .
# -mgt 将当前分支合并进test和dev
vz git -mgt test dev
```

### branch 命令

vz branch [-d<时间戳>]

- -d: --del 删除的时间戳，会删除时间戳之前的分支
```shell
vz branch -d1704067200000
```

### config 命令

会在用户目录中创建vz_cmd_config.json文件保存配置信息

- set 设置变量
- delete 删除变量
- get 获取所有变量

### wxml 命令(只能编译模板，vue2wx是wxml和wxss的合并升级版)

> 注意：目前用到的编译器只支持vue2版本，所以如果是编译vue3的template，需要自己手动在根那里加个div的根元素（vue2的组件必须有一个根元素），否则只会转换第一个根元素的内容

通过vue模板编译器对模板进行编译转换wxml

```shell
vz wxml filename.wxml
```
#### 选项
1. -t: --template, 头尾加上template
2. -c: --classTag, class中加上变更前的标签名字（只有在变更规则里的标签才会加上，组件这种自定义名字的不会加上）

### wxss命令

vz wxss [-p2 -r200] filename.scss

用于将scss转换成wxss，并且将px和rem转换成rpx

#### 选项
1. -p：--px2rpx px转换倍数
1. -r：--rem2rpx rem转换倍数

### vue2wx 命令（采用vue3的编译器，可以编译整个文件了）

用于将整个vue文件转换为微信小程序组件，如果参数是目录，将会批量转换目录中的vue文件并生成小程序组件目录

vz vue2wx [files...] [--bashUrl] [--px2rpx] [--rem2rpx]

##### 参数与选项说明
1. files： 文件或目录，可以多个
2. --bashUrl: 生成目录的时候，会记录单个目录下的所有组件路径，并与vue文件中的组件名进行匹配，bashUrl用于生成小程序json文件中组件的注册，不能以斜杠开头，最终json中的路径会转换为：/ + 输入的路径 + 生成的路径
3. -p：--px2rpx px转换倍数，默认是2倍
4. -r：--rem2rpx rem转换倍数，默认是200倍
5. -o: --on 记录开关，可以记录模板中的状态，并推断类型（不准）自动在输出的ts文件中写入状态与方法
    - -o1：记录状态
    - -o2：记录方法
    - -o3：记录状态和方法
```shell
# 注意事项
# 当scss中包含其他的scss文件，并通过@import导入时，如果导入的文件在当前处理的目录中，将会自动导入对应文件，如果不在当前目录中，会报错并停止编译
# 由于小程序会报警告不允许标签选择器在wxss中，所以转换后的标签选择器要自己改成类名(wxml会记录原来的标签类名)
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
4. -h: 用于检查文件在服务器中是否存在，需要通过vz config set checkUrl="xxx"设置地址前缀

```shell
# 查找蓝湖导出所有图片中的二倍图，并放到当前目录下的file文件夹
vz ls -m"2x\\.(png|jpg)" -c file
# 或者
vz ls --match="2x\\.(png|jpg)" -c file

# 检查文件是否存在于服务器上
# 设置前缀
vz config set checkUrl="https://xxx"
# 检查当前目录所有文件
vz ls -h
```

### tiny 命令

vz tiny [-w] [args...]

用于压缩图片（需要你的终端能使用linux命令，至少得能使用ls查询文件）

1. 当参数为.或不传时，为当前目录所有图片。为具体文件名时，会按需选择对应文件
2. -w(--wait) 选项，可赋值，用于设定请求tiny接口的时间间隔（太频繁的请求会被tiny拒绝返回）
3. -m 图片最小尺寸过滤
4. -r 将记录的之前失败的图片，重新上传(每次运行vz tiny命令只要有失败的图片，都会被记录)
```shell
# 将当前目录下所有图片进行压缩
vz tiny
# 将当前目录下a.png,b.png进行压缩，并设置接口间隔为3秒
vz tiny -w3000 a.png b.png
# 或者
vz tiny --wait=3000 a.png b.png
# 失败重新上传，并设置间隔为5秒
vz tiny -r --w5000
```

### npm 命令

vz npm -h 查看可用命令

- vz npm -r1 修改成淘宝镜像
- vz npm publish 推送npm包时自动检测镜像，非官方镜像则切换成官方镜像推送后切换回原来使用的镜像