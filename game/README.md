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

## 画面与手感
- `src/game/toon.ts`：色板（`PALETTE`）、三档卡通色阶、描边、排线纹理、圆形软影。想换配色，先改这里和 `experience.css` 顶部的 CSS 变量。
- 角色 / 飞盘 / 树都用"反向外壳"描边；场地、山丘、天空是平涂色块；没有实时阴影，用圆形软影代替（盘的影子越小说明越高）。
- 第一人称：有惯性的移动（起步加速、松手滑行）、冲刺逐渐加速、脚步起伏、转向侧倾、速度 FOV + 速度线、持盘时的手臂和挥臂动画。
- 打击感：命中停顿（接盘 / 拦截 / 得分各不同）、屏幕震动、飞盘拖尾（高速变金色）、强力传球镜头冲击、连传计数、得分横幅。
- 调手感：`createGame.ts` 的 `frame()`（相机、手臂、拖尾）和各处 `hitStop(秒, 震动强度)`；`movement.ts` 里的加速度。

## 语言 / 图鉴 / 自裁判
- 首页和暂停菜单右上角可切换中文 / English；选择会记在浏览器里。所有文案在 `src/i18n/dict.ts`（每条 `[中文, English]`），游戏逻辑只发 key，界面负责翻译。
- 规则图鉴（14 条）：遇到对应规则才解锁，存在浏览器 localStorage（`ufo-codex-v1`）。条目列表在 `game/codex.ts`。
- 自裁判：机器人偶尔会违规（双防 / 带盘走 / 贴身犯规），玩家看到后 3.5 秒内按 F 喊出。喊对加分，乱喊扣分（4 秒内不能再喊），自己撞到对手后自己喊加分更多。
  体育精神分 = 6 + 喊对 + 2×自喊 − 喊错 − 漏喊自己的犯规，限制在 0–10，结算时显示。
- 调试：网址加 `?debug`，控制台可用 `__ufo.scenario()`（玩家持盘 + 盯防者在面前）、`__ufo.violate('double')`。

## 概率模型与校准
- 所有"成功率"集中在 `game/prob.ts`：基准概率 + 各因素在 logit 空间相加（盯防站位、出手点、假动作、跨步、正反手、技术）。
- `npm run calibrate` 用 Monte Carlo 打印各种组合下盯防者碰到盘的概率，改参数后先跑它再进游戏试。

## 开盘（Pull）与盯防者
- 每一分都从开盘开始：防守方站在自己的得分线上，把盘远远踢向进攻方，然后冲回去盯人（回防期间速度 ×1.7，持续 10 秒）。
- 玩家方开盘时：按住左键蓄力自己踢（和蓄力传盘一样，满力约 60m+），或按 1 / 2 让队友 A / B 开。
- 盯防者（持盘者身前 2m 内的防守者）：只有概率碰到盘。正对着他传约 60%，偏 20°–40° 约 25%，45° 以外几乎安全；
  碰到后一半截获、一半拍落。2m 以外站在线上的防守者必截。传球线路丝带：绿 = 安全，黄 = 盯防者可能碰到，红 = 必被截。
- 机器人防守者的拦截半径 0.5m（玩家当防守者是 0.75m）。
- 相关代码：`createGame.ts` 的 `setupPoint` / `rollMarkers` / `laneState` / `hooks.pull`。

## 规则提醒（不暂停比赛）
左下角的小卡片：双防、盯防者、数秒开始、轴心脚、传球线路被堵、无身体接触、得分区、得分区内失误回到得分线。
触发条件和文案在 `createGame.ts` 的 `ruleCoach()`，冷却时间是各条 `coach(...)` 的最后一个参数。

## 常用调参位置
- 接盘半径 / 防守者拦截半径 / 争抢窗口 / 定向传球速度：`createGame.ts` 顶部 `CATCH_R` / `DEF_REACH` / `CONTEST_WINDOW` / `GUIDED_SPEED`
- 数秒触发距离、线路被堵半径：`types.ts` 的 `STALL_RADIUS` / `LANE_BLOCK_R`
- 截获 vs 封堵概率（0.5）、掉盘概率：`createGame.ts` → `resolveContest`
- 队友传球失误率（0.15）：`createGame.ts` → `hooks.throwTo`
- 队友 / 对手移动速度（4.4 × skill）、反应时间：`createPlayers.ts` → `maxSpeed`、`react`
- 飞盘升力 / 阻力 / 弧线：`disc.ts` 顶部常量
