# 一造通关指南 v2

Exam Performance Engine 是一个 Expo + React Native + TypeScript 移动端 App，用本地题库、错题权重、SRS 复现和动态调度构成提分闭环。

## 启动

```bash
npm install
npx expo start --tunnel
```

Expo 会在终端输出手机扫码用的 QR code 和 Web link。

## Web 预览

```bash
npx expo start --web
```

浏览器访问：

```text
http://localhost:19006
```

## 已实现

- 错题智能系统：答错增加 `wrongCount` 与 `errorWeight`，答对降低权重。
- 高频预测系统：按真题来源、用户错率、难度刷新 `frequencyScore`。
- 学习调度系统：默认 50% 高频错题、30% SRS 到期题、20% 新题，并按正确率动态调整。
- SRS 记忆系统：答对按 ease factor 延长间隔，答错回到 1 天。
- 4 个页面：Home、Review、Quiz、Analytics。

## 本机验证备注

- 已安装依赖并通过 `tsc --noEmit` 类型检查。
- 当前 Metro 已可通过 `http://localhost:8081` 本地启动。
- `npx expo start --tunnel` 已尝试启动，但本机网络连接 ngrok 超时；网络放通后同一命令会输出 QR code 和 Expo link。
