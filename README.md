# 折纸飞行实验室 · Paper Flight Lab

调整纸飞机外形、旋转观察三维模型、剪裁翼尾，然后试飞并比较历史轨迹的交互原型。

## 功能

- 参数调整：机头、机翼比例、翼尾微调、机身高度、机身张开角、机翼上下折角。
- 默认机身张开 15°，滑杆居中；鼠标拖动旋转、滚轮缩放、预设视角。
- 翼尾直线剪裁：左右独立或镜像，预览剪除区域后确认，可连续多次剪裁。
- 支持撤销、重做、恢复默认；设计与最近十次试飞记录存于当前浏览器 localStorage。
- 固定投掷条件的简化飞行模拟与上次轨迹比较。

## 本地运行

纯 HTML / CSS / JavaScript，无需安装前端依赖或构建。

```sh
python3 -m http.server 8000 --directory dist
```

浏览器打开 http://localhost:8000 。

## 检查

安装 Node.js 后，在仓库根目录运行：

```sh
node tests/cut-regression.cjs
node --check dist/app.js
node --check dist/cut-editor.js
node --check dist/viewer3d.js
node --check dist/physics.js
```

回归测试覆盖连续 12 次剪裁、撤销/重做、存储恢复、单侧剪裁和连接保护。测试使用模拟 DOM，不等于浏览器端交互测试。

## 文件结构

- `dist/index.html`：页面结构与编辑面板。
- `dist/style.css`：响应式界面样式。
- `dist/app.js`：应用状态、编辑、试飞与历史记录。
- `dist/viewer3d.js`：参数化三维面片、折线旋转、剪裁几何与 Canvas 投影。
- `dist/cut-editor.js`：翼尾剪裁工作台。
- `dist/physics.js`：确定性的简化飞行模拟。
- `tests/cut-regression.cjs`：剪裁回归测试。

## 模型边界

当前是概念原型，不是专业空气动力学计算或已验证的真实折纸方案。飞行使用升力、阻力、重力框架以及人为设定的系数，尚未用实物校准。相同参数产生相同结果，不随机生成距离。

机身高度、张开角、机翼上下折角与剪裁目前只改变造型，不参与飞行测算。模型未从完整 A4 纸逐步折叠生成，未验证纸层连接、面积守恒和全部参数组合的可折叠性。剪裁的面积与连接阈值属于编辑器约束，不代表实测可飞边界。

## 部署与分享

将 `dist/` 作为静态网站根目录即可部署，无后端、无 API 密钥。现有网站：

https://paper-flight-lab-yusha.elisabeth199636.chatgpt.site

网站访问权限由托管平台单独管理；GitHub 私有仓库不会自动让网站公开。本次导入保持已有网站权限。代码推送到本仓库也不会自动触发现有 Sites 网站更新，尚未配置两者的自动同步。

每位访客的记录只保存在自己的浏览器，不包含账号系统、多人联机或共享排行榜。

## 导入版本

2026-10-28：导入支持连续多次剪裁的最新版，源 Sites 提交 `063a2e1d50dede984b159214a99eba8faa43570b`。
