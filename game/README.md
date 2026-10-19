# 极限飞盘 · 第一人称体验

```bash
npm install
npm run dev     # 打开 http://localhost:3000
```

Next.js 14 (App Router) + TypeScript + three.js。three.js 只在点击"进入体验"后动态加载。

## 目录
- `src/game/types.ts`：场地常量、共享类型、事件总线（额外增加的一个文件）
- `src/game/rules.ts`：比分 / 数秒 / 回合流转状态机 + 出界、得分区判定（不依赖 three）
- `src/game/disc.ts`：飞盘物理、预测轨迹、AI 弹道求解
- `src/game/createPlayers.ts`：队友跑位、对手盯防/拦截、持盘 AI
- `src/game/movement.ts`：PointerLock 视角、WASD、冲刺体力、轴心脚锁定
- `src/game/createGame.ts`：把以上模块串起来的主循环（额外增加的一个文件）
- `src/components/*`：HUD / 暂停菜单 / 挂载与销毁

## 操作
WASD 移动 · 鼠标视角 · Shift 冲刺 · **1 / 2 直接传给队友 A / B** · 按住左键蓄力、松开自己瞄准传 · Q / E 反手 / 正手 · Esc 暂停

## 常用调参位置
- 接盘半径 / 防守者拦截半径 / 争抢窗口 / 定向传球速度：`createGame.ts` 顶部 `CATCH_R` / `DEF_REACH` / `CONTEST_WINDOW` / `GUIDED_SPEED`
- 数秒触发距离、线路被堵半径：`types.ts` 的 `STALL_RADIUS` / `LANE_BLOCK_R`
- 截获 vs 封堵概率（0.5）、掉盘概率：`createGame.ts` → `resolveContest`
- 队友传球失误率（0.15）：`createGame.ts` → `hooks.throwTo`
- 队友 / 对手移动速度（4.4 × skill）、反应时间：`createPlayers.ts` → `maxSpeed`、`react`
- 飞盘升力 / 阻力 / 弧线：`disc.ts` 顶部常量
