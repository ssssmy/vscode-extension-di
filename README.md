# vscode-extension-di

## 项目简介

vscode-extension-di 是一个为 VS Code 扩展开发设计的依赖注入（Dependency Injection, DI）框架，支持服务注册、依赖关系追踪、实例化等功能，帮助开发者以更模块化、可维护的方式组织扩展中的服务和依赖。

## 主要功能
- **服务注册与标识**：通过装饰器为服务创建唯一标识，支持依赖自动注入。
- **依赖关系管理**：自动收集和管理服务之间的依赖关系，支持依赖树打印与调试。
- **服务实例化**：支持同步描述符（SyncDescriptor）注册服务，自动实例化并缓存服务实例。
- **依赖追踪与调试**：内置依赖追踪（Trace），可输出服务实例化的依赖链路和耗时，便于调试循环依赖等问题。
- **VS Code 扩展集成**：可作为 VS Code 扩展的基础服务容器，便于扩展开发。

## 安装与使用

### 1. 安装依赖

```bash
npm install
```

### 2. 编译项目

```bash
npm run compile
```
或启动监听编译：
```bash
npm run watch
```

### 3. 在 VS Code 中调试
- 使用 VS Code 打开本项目文件夹。
- 按 F5 启动扩展开发主机进行调试。

### 4. 发布扩展

```bash
sh publish.sh
```

## 目录结构说明

- `src/`                —— 主源码目录
  - `app.ts`            —— 扩展主应用入口
  - `extension.ts`      —— VS Code 扩展激活入口
  - `main.ts`           —— 服务初始化与主流程
  - `service/`          —— DI 核心实现与服务注册
    - `config/`         —— 配置服务示例
    - `instantiation/`  —— 依赖注入核心实现
      - `descriptors.ts`        —— 服务描述符定义
      - `serviceCollection.ts`  —— 服务集合管理
      - `instantiation/`        —— 装饰器、依赖收集等
      - `instantiation-service/`—— 实例化服务、依赖图、追踪等
- `media/`              —— 插件图标、依赖关系图等
- `resources/`          —— 主题相关图标资源
- `USAGE.md`            —— VS Code 视图贡献点等用法说明
- `publish.sh`          —— 扩展发布脚本

## 贡献指南

1. Fork 本仓库并新建分支。
2. 保持代码风格一致，建议使用 ESLint 检查。
3. 提交 PR 前请确保能通过 `npm run lint`。
4. 欢迎提交 issue 或 PR 参与改进。

## 许可证

MIT License

---

如需详细用法和扩展开发说明，请参考 [USAGE.md](./USAGE.md)。
