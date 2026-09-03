# Jam Lab

Jam Lab 是一个面向鼓手和音乐学习者的浏览器节奏训练工具。输入鼓节奏、速度、音乐风格与情绪后，它会生成约三分钟、可跟练的虚拟乐队编曲。

## 在线使用

[打开 Jam Lab](https://divinetianci-ltc.github.io/jam-lab/)

首次打开后可安装为网页 App。已访问过的资源会被缓存，适合在网络不稳定时继续使用。

## 功能

- 六轨鼓谱编辑：Crash、踩镲、高音嗵鼓、军鼓、落地嗵鼓与底鼓
- 八分、三连音、十六分与六连音划分
- 常规、重音、鬼音与单点 Double 双击滚奏
- Pop、Rock、Metal、Funk、Neo-Soul、Dance 等多种音乐风格
- 按风格和情绪变化的 Bass、Keys、Guitar、效果器与三段均衡器
- 一小节预备拍、时间线定位、实时鼓点修改与多种练习模式
- 分享链接与工程文件下载
- 响应式手机/电脑界面，无需账号和 API Key

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm ci
npm run dev
```

GitHub Pages 的静态发布文件位于 `docs/`。修改源码后，先完成项目构建，再运行：

```bash
npm run export:github
```

## License

[MIT](LICENSE)

