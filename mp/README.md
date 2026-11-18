# 它眼里的世界 · 微信小程序版

浏览器版（`../dist/index.html`）的移植骨架。数据层、文案生成、主题、按钮排序都是**同一份代码**，
视图层换成了 WXML/WXSS。

## 怎么跑起来

1. 装 **微信开发者工具**（稳定版即可）
2. 「导入项目」→ 目录选这个 `mp/` 文件夹
3. AppID：
   - 只想看界面 → 点「测试号」
   - 要真机预览 / 用云开发 → 填自己的 AppID（`mp.weixin.qq.com` 里注册一个，个人主体就行）
4. 云开发（可选，现在只有登录用得到）：
   - 开发者工具点「云开发」→ 开通 → 复制**环境 ID**
   - 填到 `app.js` 的 `globalData.envId`
   - 右键 `cloudfunctions/login` → 「上传并部署：云端安装依赖」
   - 填不填都能用，填了只是能拿到 openid；没填就纯本地跑

打开就能用：第一页是建档（名字 / 猫狗 / 品种 / 性格），建完就是「今天」页。

## 里面有什么

| 页面 | 内容 |
|---|---|
| 今天 | 第 N 天、它的一句话、按钮网格（可编辑排序）、今天的事实、备注、写日记 |
| 日记 | 按月分的日记列表 |
| 档案 | 档案表（出生/到家/品种/体重/疫苗/驱虫，**可编辑、可自加字段**）、按年份的重要节点、加点、体重 |
| 它 | 资料修改、换主题（5 套）、按钮管理、导出备份、示例数据、重新开始 |

- 按钮编辑：点右上「编辑」→ 出现 `×`（收起）、`‹ ›`（左右挪）；收起的按钮在下面，点一下回来
- 写日记时会用当天最「重」的事件决定标题和开场（打疫苗、手术、洗澡这类优先）
- 5 套主题：纸墨 / 夜灯 / 薄荷 / 樱野 / 旧照，颜色都是 CSS 变量

## 头像：照片优先

「它」页点一下头像（右下角有相机小圆点）→ 从相册选一张 / 拍一张 → 存到本地
（`wx.getFileSystemManager().saveFile` 到 `USER_DATA_PATH`，重启还在）。

![档案页](../screenshots/mp-archive.png)

**所有地方都会跟着换成这张照片**：今天页的问候、它页大头像、档案页抬头。

- 「换一张照片」重选，「用回画的」删掉照片回到插画
- 建档时也能直接选（「头像 · 上传它的照片，或者先用画的」）
- 没照片时用的是**和浏览器版同一套矢量画导出的 PNG**：`assets/faces/` 里 26 品种 × calm/happy 共 52 张
  （`tools/faces-manifest.mjs` 出清单、`shots/faces-grid.html` 渲染、`tools/slice-faces.ps1` 切片），
  所以小程序里的头像和网页版长得一模一样
- 某张图缺失时会退回用 `view` 拼的简化脸，不会空着

想要更「真实」就上传照片；插画只是兜底，所以画得克制。

## 和浏览器版的差别（故意的简化）

| | 浏览器版 | 小程序版 |
|---|---|---|
| 头像 | 手绘 SVG，26 品种 × 7 心情 | 预生成的 PNG（26 品种 × calm/happy，其余心情归到这两种）；也可以直接上传照片 |
| 照片视频 | IndexedDB 存原图 | **还没做**（下一步走 `wx.chooseMedia` + 云存储） |
| 分享图 | canvas 导出 PNG | **还没做**（下一步用 `wx.createOffscreenCanvas` 重画） |
| 拖动排序 | 指针拖拽 | `‹ ›` 按钮挪位（小程序里拖动要 `movable-view`，先求稳） |
| 存储 | IndexedDB | `wx.setStorageSync`（上限 10MB，所以照片必须上云） |

## 文件结构

```
mp/
├── app.js / app.json / app.wxss      # 全局：主题变量、卡片、按钮、chips 样式
├── project.config.json
├── cloudfunctions/login/             # 只返回 openid，可选
├── components/face/                  # 拼出来的头像（properties: species/mood/breedId/size）
├── utils/
│   ├── pt-core.js                    # 共享 PT 对象 + PT.STORAGE（wx 存储适配，node 下可注入）
│   ├── all.js                        # 一次装齐 types/writer/theme/store，页面只需要 require 它
│   ├── types.js writer.js theme.js store.js   # ← 从 ../src 同步过来，别直接改
│   ├── face.js                       # 品种 → 头像样式
│   ├── chips.js                      # 按钮列表的增删排序
│   └── theme-style.js                # 主题 → 内联 style 串
└── pages/today | diary | entry | archive | pet
```

`utils/` 里那四个文件是同步产物，**要改去改 `../src/` 下的原件**，然后：

```bash
node tools/mp-sync.mjs     # 同步 + 把 window/localStorage 换成小程序写法
```

## 自检

```bash
node tools/mp-smoke.mjs    # 数据层 / 主题 / 按钮 / 档案（含字段增删改）/ 头像 36 项
node tools/wxml-check.mjs  # WXML 里绑定的变量、事件方法是否都存在
```

## 上架前还要补的

- 照片视频（存云存储，别塞 storage）
- 分享图（朋友圈/对话卡片）
- 订阅消息（疫苗到期提醒，一次性订阅）
- 隐私保护指引（用相册相机要声明）
- 内容安全（自定义性格/事件名是 UGC，接 `msgSecCheck`）
- ICP 备案（2023-09 起必须，管局 1–20 个工作日）
