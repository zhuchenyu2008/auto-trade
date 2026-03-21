# Auto Trade Web Console

## 目标

这是自动交易系统的前端工作台，当前阶段优先完成以下目标：

- 固定单用户控制台的信息架构
- 固定视觉系统与设计 token
- 用 mock 数据先跑通核心页面
- 为后续接入真实 API 保留稳定契约

## 当前状态

当前版本是前端优先阶段的首版骨架，特点如下：

- 使用 `React + Vite + TypeScript + react-router`
- 路由与页面结构已按技术设计文档落地
- 目前以本地 mock 数据驱动
- 登录流程为原型级实现，接受任意 `6` 位数字密码

## 运行命令

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 目录结构

```text
apps/web
├─ src
│  ├─ components        # 通用展示组件
│  ├─ pages             # 页面级组件
│  ├─ auth.tsx          # 原型阶段认证上下文
│  ├─ mock-data.ts      # 首批页面的 mock 数据源
│  ├─ types.ts          # 前端对象类型
│  ├─ App.tsx           # 路由与应用入口
│  └─ styles.css        # 全局设计 token 与页面样式
├─ index.html
├─ package.json
└─ vite.config.ts
```

## 现阶段约定

- 视觉 token 统一写在 `src/styles.css`
- 页面首屏字段命名与 `docs/technical-design/web-console/04-api-contract-draft.md` 保持一致
- mock 数据统一集中在 `src/mock-data.ts`
- 真实状态对象与虚拟状态对象不得混用字段语义

## 后续接 API 时优先替换的点

1. 用真实会话接口替换 `src/auth.tsx` 中的原型登录逻辑。
2. 用查询层替换 `src/mock-data.ts` 的静态数据读取。
3. 用 `/api/v1/events/stream` 替换日志和状态的静态展示。
4. 将人工确认页的本地状态流转替换成真实接口调用。

## 对应文档

- [技术设计总览](../../docs/technical-design/README.md)
- [Web 控制台父文档](../../docs/technical-design/07-web-console.md)
- [信息架构](../../docs/technical-design/web-console/01-information-architecture.md)
- [页面规格](../../docs/technical-design/web-console/02-page-specs.md)
- [视觉系统](../../docs/technical-design/web-console/03-visual-system.md)
- [API 契约草案](../../docs/technical-design/web-console/04-api-contract-draft.md)
- [实现记录](../../docs/technical-design/web-console/05-frontend-implementation-notes.md)
