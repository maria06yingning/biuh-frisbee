import * as THREE from 'three';
import { createScene } from './createScene';
import { createField } from './createField';
import {
  animateAgents,
  assignMarks,
  clampToField,
  createPlayers,
  createViewArm,
  laneClearance,
  resetFormation,
  syncAgents,
  updateAI,
  updateMarkers,
  yawOf,
} from './createPlayers';
import { createInput, createUserControl, updateUserMovement } from './movement';
import {
  MAX_SPEED,
  MIN_SPEED,
  PHYS_STEP,
  createDisc,
  createTrail,
  launchDisc,
  simulateFlight,
  solveAim,
  syncDiscObject,
  throwDisc,
  updateDisc,
  updateTrail,
} from './disc';
import { PALETTE } from './toon';
import { biteProb, markerBlockProb, releaseNoise } from './prob';
import { Rules, inAttackZone, isOutOfBounds, restartSpot, type RuleEvent } from './rules';
import {
  Emitter,
  END_Z,
  FIELD_HALF_W,
  GOAL_Z,
  HAND_HEIGHT,
  EYE_HEIGHT,
  LANE_BLOCK_R,
  MARKER_ZONE,
  STALL_RADIUS,
  WIN_SCORE,
  ZONE_DEPTH,
  otherTeam,
  teamDir,
  type Agent,
  type AIHooks,
  type CurveType,
  type GameEvents,
  type HudState,
  type TeamId,
  type TurnoverReason,
  type ViolationType,
  type World,
} from './types';

const CATCH_R = 1.15; // 进攻方接盘半径
const DEF_REACH = 0.75; // 玩家当防守者时的拦截半径（明显小于接盘半径）
const DEF_REACH_AI = 0.5; // 机器人防守者的拦截半径（更小）
const ZONE_NOTE = 'note.zone';
const GUIDED_SPEED = 18; // 按键定向传球的飞行速度 m/s
const CONTEST_WINDOW = 0.12; // 争抢窗口（秒）：窗口内取每个人最近距离再判定
const TRAJ_N = 150;
const clamp = THREE.MathUtils.clamp;

export interface GameHandle {
  bus: Emitter<GameEvents>;
  /** 必须在用户点击事件里调用（浏览器要求手势才能锁定鼠标） */
  requestLock(): void;
  restart(): void;
  startTutorial(): void;
  dispose(): void;
  /** 调试入口：网址加 ?debug 时挂到 window.__ufo，用来摆好场景测试跨步 / 假动作 / 喊违规 */
  debug: {
    scenario(): void;
    violate(type: ViolationType): void;
  };
}

export function createGame(container: HTMLElement): GameHandle {
  const bus = new Emitter<GameEvents>();
  const ctx = createScene(container);
  const canvas = ctx.renderer.domElement;
  const field = createField(ctx.scene);
  const agents = createPlayers(ctx.scene);
  const user = agents[0];
  const disc = createDisc(ctx.scene);
  const control = createUserControl();

  const world: World = {
    agents,
    holder: null,
    disc,
    offense: 0,
    dirA: 1,
    time: 0,
    stallElapsed: 0,
    refPos: new THREE.Vector3(),
    landing: new THREE.Vector3(),
    throwTime: 0,
    frozen: true,
    loose: false,
    pickupTeam: 0,
    passive: false,
    pullPending: false,
    pulling: false,
    force: [-1, -1],
    rush: 0,
    readyT: 0,
  };

  let disposed = false;
  let paused = true;
  let raf = 0;
  let last = performance.now();
  let charge = 0;
  let charging = false;
  let curve: CurveType = 'backhand';
  let guide = true;
  let pickupReadyAt = 0;
  let hudT = 0;
  let discAcc = 0;
  let contest: Map<number, number> | null = null;
  let contestT = 0;
  let pendingPass: 0 | 1 | 2 = 0; // 玩家按下的 1 / 2 键
  let stallNear = false; // 防守者是否在 3m 内
  let prevStallNear = false;
  const ignoreDef = new Set<number>(); // 本次传球中"没碰到盘"的盯防者
  // 跨步 / 假动作 / 自裁判
  let stepDir = 0;
  let stepT = 0;
  let stepOff = 0; // 跨步的侧向位移（-1 左 … +1 右）
  let fakeT = 0;
  let fakeCD = 0;
  const fakeLog: number[] = [];
  let callCD = 0;
  const viols: { type: ViolationType; id: number; at: number; done: boolean }[] = [];
  const spirit = { correct: 0, wrong: 0, self: 0, missed: 0 };
  let selfContactT = 0;
  let selfContactNext = 0;
  // 严重犯规回盘：持盘者在被贴身犯规（throwing foul）的状态下传出、且传球被换攻时，
  // 喊对犯规可以把盘判回原持盘者（WFDF 17.6「传球犯规且影响了结果」）
  let throwFoul: { spot: { x: number; z: number }; at: number; called: boolean } | null = null;
  // 新手教程
  const TUT_TOTAL = 7;
  let tut: {
    step: number;
    stepDone: boolean;
    advanceT: number;
    retryT: number;
    resetIn: number;
    timer: number;
    moved: number;
    yawSum: number;
    thrown: boolean;
    staged: boolean;
    warned: boolean;
    hinted: boolean;
  } | null = null;
  let tutSkillAt = -99; // 最近一次用跨步 / 假动作的时间
  let tutLastX = 0;
  let tutLastZ = 0;
  let tutLastYaw = 0;
  // 手感 / 反馈状态
  let chain = 0; // 连续传球次数
  let chainTeam: TeamId = 0;
  let freezeT = 0; // 命中停顿
  let shake = 0; // 屏幕震动
  let fovPunch = 0; // 强力传球时的 FOV 冲击
  let bobPhase = 0;
  let roll = 0;
  let prevYaw = 0;
  let swingT = 0; // 投掷挥臂动画
  let swingSign = 1; // 1 = 反手（从右往左），-1 = 正手
  let armIn = 1; // 接盘时手臂举起的进度
  let wasHolding = false;
  const tipNext = new Map<string, number>(); // 规则提醒的冷却

  const _hp = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _vel = new THREE.Vector3();
  const _land = new THREE.Vector3();
  const _tg = new THREE.Vector3();
  const aim = { dir: new THREE.Vector3(), speed: 0 };

  const rules = new Rules(handleRule);

  /* ───────── 场景内的"判断辅助"：传球线路 / 预测落点 ───────── */
  // 传球线路：一根扁平的彩色丝带（绿 = 安全，红 = 有人站在线上）
  const ribbonGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6);
  ribbonGeo.rotateX(Math.PI / 2); // 轴向沿 z，方便 lookAt
  const laneLines = [1, 2].map(() => {
    const m = new THREE.Mesh(ribbonGeo, new THREE.MeshBasicMaterial({ color: 0x9dff4a }));
    m.visible = false;
    ctx.scene.add(m);
    return m;
  });
  // 蓄力时的预测弧线：一串奶油色小圆点
  const ARC_DOTS = 40;
  const arcDots = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshBasicMaterial({ color: PALETTE.cream }),
    ARC_DOTS,
  );
  arcDots.frustumCulled = false;
  arcDots.visible = false;
  ctx.scene.add(arcDots);
  const trajArr = new Float32Array(TRAJ_N * 3);
  const _m4 = new THREE.Matrix4();
  const _lp = new THREE.Vector3();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.72, 32),
    new THREE.MeshBasicMaterial({
      color: PALETTE.cream,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ctx.scene.add(ring);
  const trail = createTrail(ctx.scene); // 飞盘拖尾
  const viewArm = createViewArm(ctx.camera); // 第一人称手臂

  // 空中飞盘的落点提示：地面圆圈（= 大致的接盘范围）+ 一根光柱
  const landRing = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1, 48),
    new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  );
  landRing.rotation.x = -Math.PI / 2;
  landRing.visible = false;
  ctx.scene.add(landRing);
  const landBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 6, 8),
    new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  landBeam.visible = false;
  ctx.scene.add(landBeam);

  const input = createInput(canvas, {
    onLockChange: onLock,
    onCurve: (c) => {
      curve = c;
      coach('throws', 90);
    },
    onPass: (slot) => {
      pendingPass = slot;
    },
    onFake: () => doFake(),
    onCall: () => callFoul(),
    onSkip: () => tutSkip(),
    onStep: (dir) => doStep(dir),
  });

  /* ───────── 命中停顿 / 屏幕震动（Windjammers 式的打击感） ───────── */
  function hitStop(sec: number, amount: number): void {
    freezeT = Math.max(freezeT, sec);
    shake = Math.max(shake, amount);
  }

  /* ───────── 工具 ───────── */
  function handPos(a: Agent, out: THREE.Vector3): THREE.Vector3 {
    const yaw = a.isUser ? control.yaw : a.yaw;
    const side = 0.2 + (a.isUser ? stepOff * 0.6 : 0); // 跨步：出手点向侧面移动
    return out.set(
      a.pos.x - Math.sin(yaw) * 0.5 + Math.cos(yaw) * side,
      HAND_HEIGHT,
      a.pos.z - Math.cos(yaw) * 0.5 - Math.sin(yaw) * side,
    );
  }

  /** 盯防者当前"逼"你用哪只手：他站在你左侧 → 逼正手（空位在右），站在右侧 → 逼反手 */
  function currentForce(): HudState['force'] {
    if (world.holder !== user || disc.mode !== 'held' || world.pullPending) return null;
    const rx = Math.cos(control.yaw);
    const rz = -Math.sin(control.yaw);
    let best = 3;
    let lat = 0;
    for (const o of agents) {
      if (o.team === 0) continue;
      const d = Math.hypot(o.pos.x - user.pos.x, o.pos.z - user.pos.z);
      if (d < best) {
        best = d;
        lat = (o.pos.x - user.pos.x) * rx + (o.pos.z - user.pos.z) * rz;
      }
    }
    if (best >= 3 || Math.abs(lat) < 0.12) return null;
    return lat < 0 ? 'forehand' : 'backhand';
  }

  function emitHud(): void {
    bus.emit('hud', buildHud());
  }

  function buildHud(): HudState {
    const h = world.holder;
    let possession: HudState['possession'] = 'air';
    if (disc.mode === 'held' && h) possession = h.isUser ? 'user' : h.team === 0 ? 'mate' : 'opp';
    else if (world.loose) possession = 'loose';
    // 指向"你们进攻的得分区"的箭头角度
    const gx = -user.pos.x;
    const gz = rules.dirA * (GOAL_Z + ZONE_DEPTH / 2) - user.pos.z;
    const fx = -Math.sin(control.yaw);
    const fz = -Math.cos(control.yaw);
    const rx = Math.cos(control.yaw);
    const rz = -Math.sin(control.yaw);
    let landing: HudState['landing'] = null;
    if (disc.mode === 'flying' && disc.guidedTarget < 0 && !disc.dead) {
      const lx = world.landing.x - user.pos.x;
      const lz = world.landing.z - user.pos.z;
      landing = {
        angle: Math.atan2(lx * rx + lz * rz, lx * fx + lz * fz),
        dist: Math.hypot(lx, lz),
        mine: (world.pulling ? otherTeam(disc.throwTeam) : disc.throwTeam) === 0,
      };
    }
    return {
      phase: rules.phase,
      scoreA: rules.score[0],
      scoreB: rules.score[1],
      winScore: WIN_SCORE,
      possession,
      offense: world.offense,
      userHasDisc: possession === 'user',
      pullPending: world.pullPending,
      pulling: world.pulling,
      charge: charging ? charge : 0,
      stallLeft:
        rules.stallActive && disc.mode === 'held' && !world.pullPending ? Math.max(0, 10 - rules.stallElapsed) : null,
      stallRunning: stallNear,
      stamina: control.stamina,
      force: currentForce(),
      spirit: spiritScore(),
      tutorial: tut ? { step: tut.step, total: TUT_TOTAL, done: tut.stepDone } : null,
      exhausted: control.exhausted,
      curve,
      goalAngle: Math.atan2(gx * rx + gz * rz, gx * fx + gz * fz),
      guide: guide && !tut,
      landing,
      speed: Math.min(1, Math.hypot(user.vel.x, user.vel.z) / 7.6),
      chain,
      chainTeam,
    };
  }

  /* ───────── 持盘 / 换攻 ───────── */
  function giveDisc(a: Agent): void {
    world.holder = a;
    world.loose = false;
    world.pulling = false;
    disc.guidedTarget = -1;
    disc.mode = 'held';
    disc.vel.set(0, 0, 0);
    disc.dead = false;
    disc.deadReason = null;
    world.offense = a.team;
    rules.offense = a.team;
    world.refPos.copy(a.pos);
    world.stallElapsed = 0;
    rules.startStall();
    a.vel.set(0, 0, 0);
    a.throwT = 1.4 + Math.random() * 2.6; // AI 1.4–4 秒内传出
    a.evalT = 0;
    a.bestTarget = -1;
    assignMarks(agents, a.team);
    charge = 0;
    charging = false;
    contest = null;
    rollCheats(a);
    if (tut) {
      for (const x of agents) x.cheat = 0;
      rules.stopStall();
    }
  }

  /** 每次换手，机器人有一定概率犯规——玩家要靠观察自己发现 */
  function rollCheats(a: Agent): void {
    for (const x of agents) {
      x.cheat = 0;
      x.cheatT = 0;
      x.cheatDelay = 0;
    }
    if (world.pullPending) return;
    const r = Math.random();
    if (a.team === 0) {
      const opp = agents.filter((o) => o.team === 1);
      if (r < 0.14) {
        // 双防：一个本来盯别人的防守者跑过来
        let best: Agent | null = null;
        let bd = Infinity;
        for (const o of opp) {
          if (o.markId === a.id) continue;
          const d = Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z);
          if (d < bd) {
            bd = d;
            best = o;
          }
        }
        if (best) {
          best.cheat = 1;
          best.cheatT = 5;
        }
      } else if (r < 0.24) {
        const mk = opp.find((o) => o.markId === a.id);
        if (mk) {
          mk.cheat = 3;
          mk.cheatT = 3;
        }
      }
    } else if (!a.isUser && r < 0.2) {
      a.cheat = 2; // 带盘走
      a.cheatDelay = 1.2 + Math.random() * 1.5;
      a.cheatT = 0.6;
      a.ox = a.pos.x;
      a.oz = a.pos.z;
    }
  }

  function toastTurnover(reason: TurnoverReason, to: TeamId, note = ''): void {
    const gained = to === 0;
    if (tut) {
      bus.emit('toast', { title: 'tut.retry.t', sub: 'tut.retry.s', kind: 'info' });
      return;
    }
    bus.emit('codex', { id: 'turnover' });
    const base = `turnover.${reason}.${gained ? 'gain' : 'lose'}`;
    bus.emit('toast', { title: `${base}.t`, sub: `${base}.s`, note: note || undefined, kind: gained ? 'good' : 'bad' });
  }

  /** 飞盘留在 spot 处，由 to 队的人跑过去捡（不再瞬移）；捡起前不数秒 */
  function makeLoose(to: TeamId, spot: { x: number; z: number }): void {
    disc.mode = 'grounded';
    disc.pos.set(spot.x, 0.03, spot.z);
    disc.vel.set(0, 0, 0);
    disc.dead = false;
    disc.deadReason = null;
    disc.guidedTarget = -1;
    world.holder = null;
    world.loose = true;
    world.pulling = false;
    world.pickupTeam = to;
    world.offense = to;
    rules.offense = to;
    rules.stopStall();
    world.stallElapsed = 0;
    world.refPos.set(spot.x, 0, spot.z);
    assignMarks(agents, to);
    contest = null;
    charging = false;
    charge = 0;
  }

  function doTurnover(reason: TurnoverReason, to: TeamId, spot: { x: number; z: number }, note = ''): void {
    chain = 0;
    makeLoose(to, spot);
    toastTurnover(reason, to, note);
    if (note) {
      coach('zoneTO', 30);
    }
  }

  /** 开盘的盘落地：接盘方去捡（出界也一样，取边线内侧） */
  function pullLanded(): void {
    const out = isOutOfBounds(disc.pos.x, disc.pos.z);
    makeLoose(otherTeam(disc.throwTeam), restartSpot(disc.pos.x, disc.pos.z));
    bus.emit('toast', { title: out ? 'toast.pull.out.t' : 'toast.pull.land.t', sub: 'toast.pull.s', kind: 'info' });
  }

  /** 每一分都从开盘（pull）开始：receiving 是接盘方（进攻方），另一方站在自己得分线上开盘 */
  function setupPoint(receiving: TeamId, delay = 0): void {
    resetFormation(agents, rules.dirA, receiving);
    const puller = agents.find((a) => a.team === otherTeam(receiving)) as Agent; // 玩家方开盘时默认是玩家本人
    world.dirA = rules.dirA;
    chain = 0;
    throwFoul = null;
    world.frozen = delay > 0; // 新一回合先"各就各位"
    world.readyT = delay;
    world.rush = 0; // 开盘踢出后，防守方才开始冲回来
    world.force = [Math.random() < 0.7 ? -1 : 1, Math.random() < 0.7 ? -1 : 1]; // 多数队伍逼正手
    field.setAttackZone(rules.dirA);
    contest = null;
    charge = 0;
    charging = false;
    discAcc = 0;
    control.yaw = user.yaw;
    control.pitch = 0;
    disc.mode = 'grounded';
    giveDisc(puller);
    world.pullPending = true;
    rules.stopStall();
    puller.throwT = 1.0;
  }

  /** 盯防者（持盘者身前 2m 内）只有概率碰到盘，概率见 prob.ts：
   *  正对他传最危险；偏开越多越安全；跨步改变出手点；假动作骗到他后短时间很安全；
   *  出手方式背向他（他在左侧时用正手，在右侧时用反手）更难被碰到。
   *  typeSide：-1 反手 / +1 正手 / 0 机器人（随机，70% 选背向盯防者的出手方式） */
  function rollMarkers(thrower: Agent, dx: number, dz: number, typeSide: -1 | 0 | 1): void {
    ignoreDef.clear();
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    const yaw = thrower.isUser ? control.yaw : thrower.yaw;
    const rxv = Math.cos(yaw); // 持盘者的右手方向
    const rzv = -Math.sin(yaw);
    const off = thrower.isUser ? stepOff * 0.6 : 0;
    const ox = thrower.pos.x + rxv * off;
    const oz = thrower.pos.z + rzv * off;
    for (const o of agents) {
      if (o.team === thrower.team || o.isUser) continue; // 玩家当盯防者时，靠自己站位
      const rx = o.pos.x - ox;
      const rz = o.pos.z - oz;
      const along = rx * ux + rz * uz;
      if (along < -0.3 || along > MARKER_ZONE) continue;
      const perp = Math.abs(rx * uz - rz * ux);
      const lat = (o.pos.x - thrower.pos.x) * rxv + (o.pos.z - thrower.pos.z) * rzv;
      const markerSide = lat < 0 ? -1 : 1;
      const prot = typeSide === 0 ? Math.random() < 0.7 : typeSide === -markerSide;
      const p = markerBlockProb({ perp, bite: o.biteUntil > world.time, skill: o.skill, protectedType: prot });
      if (Math.random() >= p) ignoreDef.add(o.id);
    }
  }

  function afterThrow(thrower: Agent): void {
    const wasPull = world.pullPending;
    if (world.pullPending) {
      // 开盘踢出：另一方成为进攻方，踢盘方开始冲回来盯人
      world.pullPending = false;
      world.pulling = true;
      const receiving = otherTeam(thrower.team);
      world.offense = receiving;
      rules.offense = receiving;
      assignMarks(agents, receiving);
      world.rush = 10;
      ignoreDef.clear();
    } else {
      let dx = disc.vel.x;
      let dz = disc.vel.z;
      if (disc.guidedTarget >= 0) {
        dx = agents[disc.guidedTarget].pos.x - thrower.pos.x;
        dz = agents[disc.guidedTarget].pos.z - thrower.pos.z;
      }
      rollMarkers(thrower, dx, dz, thrower.isUser ? (curve === 'backhand' ? -1 : 1) : 0);
    }
    world.holder = null;
    rules.stopStall();
    world.throwTime = world.time;
    world.landing.copy(disc.landing);
    world.refPos.copy(thrower.pos);
    contest = null;
    discAcc = 0;
    if (thrower.isUser) {
      charge = 0;
      charging = false;
      guide = false;
    }
    // 出手瞬间若正被贴身犯规（防守方），记下出手点，供换攻后喊对回盘
    throwFoul =
      thrower.isUser && !wasPull && activeContactFoulOnUser()
        ? { spot: { x: thrower.pos.x, z: thrower.pos.z }, at: world.time, called: false }
        : null;
  }

  /* ───────── 接盘 / 拦截 / 封堵判定 ───────── */
  function trackContest(): void {
    const receiverTeam = world.pulling ? otherTeam(disc.throwTeam) : disc.throwTeam;
    for (const a of agents) {
      if (world.pulling && a.team === disc.throwTeam) continue; // 开盘：踢盘的一方不能碰
      if (a.id === disc.throwerId && disc.flightTime < 0.35) continue;
      if (ignoreDef.has(a.id) && disc.flightTime < 0.35) continue; // 盯防者这次没碰到
      const mine = a.team === receiverTeam;
      const sprint = a.vel.lengthSq() > 20;
      // 接盘手够得远，防守者的拦截范围小得多（机器人比玩家更小）
      const reach = a.isUser ? DEF_REACH : DEF_REACH_AI;
      const r = mine ? CATCH_R + (a.isUser ? 0.5 : 0) + (sprint ? 0.3 : 0) : reach + (sprint ? 0.15 : 0);
      const yMin = mine ? 0.15 : 0.25;
      const yMax = mine ? 2.4 : a.isUser ? 2.1 : 1.9;
      if (disc.pos.y < yMin || disc.pos.y > yMax) continue;
      const d = Math.hypot(a.pos.x - disc.pos.x, a.pos.z - disc.pos.z);
      if (d > r) continue;
      if (!contest) {
        contest = new Map();
        contestT = 0;
      }
      const q = d / r;
      const prev = contest.get(a.id);
      if (prev === undefined || q < prev) contest.set(a.id, q);
    }
    if (contest) {
      contestT += PHYS_STEP;
      if (contestT >= CONTEST_WINDOW) resolveContest();
    }
  }

  function knockDown(reason: TurnoverReason): void {
    disc.guidedTarget = -1; // 定向传球被拍落后改走物理下落
    chain = 0;
    hitStop(0.1, 0.2);
    disc.dead = true;
    disc.deadReason = reason;
    disc.vel.multiplyScalar(0.25);
    disc.vel.y = -1.5;
  }

  /** 进攻方接到盘：转移控制权；在对方得分区内 = 得分 */
  function completeCatch(a: Agent): void {
    const wasGuided = disc.guidedTarget >= 0; // giveDisc 会清掉，先记下来
    const thrower = disc.throwerId;
    chain = chainTeam === a.team && chain > 0 ? chain + 1 : 1;
    chainTeam = a.team;
    hitStop(0.05, 0.06);
    giveDisc(a);
    pickupReadyAt = world.time + 0.25;
    const scoring = inAttackZone(a.pos.z, teamDir(rules.dirA, a.team));
    if (tut) {
      tutOnCatch(a, thrower, wasGuided, scoring);
      return;
    }
    if (scoring) rules.scorePoint(a.team);
  }

  function resolveContest(): void {
    if (!contest) return;
    const entries = Array.from(contest.entries());
    contest = null;
    let winner: Agent | null = null;
    let wScore = -1;
    let wq = 0;
    for (const [id, q] of entries) {
      const a = agents[id];
      // 越靠近越占优 + 一点随机（争抢）；被传球目标一方略有优势
      const s = (1 - q) * 0.7 + Math.random() * 0.3 + (a.team === disc.throwTeam ? 0.08 : 0);
      if (s > wScore) {
        wScore = s;
        winner = a;
        wq = q;
      }
    }
    if (!winner) return;

    if (world.pulling) {
      // 开盘：只有接盘方能碰盘，小概率没接稳
      if (Math.random() < 0.04 + 0.1 * wq) {
        knockDown('drop');
        return;
      }
      giveDisc(winner);
      chain = 0;
      hitStop(0.05, 0.06);
      pickupReadyAt = world.time + 0.25;
      bus.emit('toast', {
        title: 'toast.pull.caught.t',
        sub: 'toast.pull.caught.s',
        kind: winner.team === 0 ? 'good' : 'info',
      });
      return;
    }

    if (winner.team === disc.throwTeam) {
      // 进攻方接盘：防守者越近、盘越偏，掉盘概率越高
      let near = 99;
      for (const o of agents) {
        if (o.team === winner.team) continue;
        near = Math.min(near, Math.hypot(o.pos.x - winner.pos.x, o.pos.z - winner.pos.z));
      }
      const dropP = 0.02 + 0.1 * wq + (near < 2.5 ? 0.14 * (1 - near / 2.5) : 0);
      if (Math.random() < dropP) {
        knockDown('drop');
        return;
      }
      completeCatch(winner);
    } else if (Math.random() < 0.5) {
      // 防守者碰到了盘：一半截获，一半只是拍落
      toastTurnover('intercept', winner.team);
      chain = 0;
      hitStop(0.12, 0.3);
      giveDisc(winner);
      pickupReadyAt = world.time + 0.25;
    } else {
      knockDown('block');
    }
  }

  function onLanded(): void {
    if (world.pulling) {
      pullLanded();
      return;
    }
    const reason: TurnoverReason =
      disc.deadReason ?? (isOutOfBounds(disc.pos.x, disc.pos.z) ? 'out' : 'ground');
    const inZone = Math.abs(disc.pos.z) > GOAL_Z;
    doTurnover(reason, otherTeam(disc.throwTeam), restartSpot(disc.pos.x, disc.pos.z), inZone ? ZONE_NOTE : '');
  }

  /* ───────── AI 传盘 ───────── */
  const hooks: AIHooks = {
    throwTo(from, to) {
      if (world.holder !== from || disc.mode !== 'held' || rules.phase !== 'playing') return;
      handPos(from, _hp);
      const dist = Math.hypot(to.pos.x - from.pos.x, to.pos.z - from.pos.z);
      const lead = Math.min(1.3, dist / 14); // 提前量：传向对方将要跑到的位置
      _tg.set(
        clamp(to.pos.x + to.vel.x * lead, -(FIELD_HALF_W - 1), FIELD_HALF_W - 1),
        0,
        clamp(to.pos.z + to.vel.z * lead, -(END_Z - 1), END_Z - 1),
      );
      solveAim(_hp, _tg, 0, aim);
      const flub = !tut && Math.random() < (to.isUser ? 0.05 : 0.15); // 传给玩家时更稳
      launchDisc(disc, _hp, from, aim.dir, aim.speed, 0, flub ? 0.09 : 0.012);
      afterThrow(from);
    },
    violation(type, who) {
      logViolation(type, who);
    },
    pull(from) {
      if (world.holder !== from || disc.mode !== 'held' || !world.pullPending || rules.phase !== 'playing') return;
      handPos(from, _hp);
      // 接盘方站在自己的得分线上；把盘落在他们身前 4–9 米
      const dirRecv = teamDir(rules.dirA, otherTeam(from.team));
      _tg.set((Math.random() * 2 - 1) * 5, 0, -dirRecv * GOAL_Z + dirRecv * (4 + Math.random() * 5));
      solveAim(_hp, _tg, 0, aim);
      launchDisc(disc, _hp, from, aim.dir, aim.speed, 0, 0.02);
      afterThrow(from);
    },
  };

  /* ───────── 玩家投掷 ───────── */
  function doUserThrow(): void {
    const power = Math.max(0.12, charge);
    const cp = Math.cos(control.pitch);
    _dir.set(-Math.sin(control.yaw) * cp, Math.sin(control.pitch), -Math.cos(control.yaw) * cp);
    const noise = releaseNoise({ type: curve, stall: world.stallElapsed, power, pitch: control.pitch, stepOff });
    handPos(user, _hp);
    throwDisc(disc, _hp, user, power, _dir, curve === 'backhand' ? -1 : 1, noise);
    afterThrow(user);
    swingT = 0.22;
    swingSign = curve === 'backhand' ? 1 : -1;
    if (power > 0.85) {
      fovPunch = 5; // 强力传球：镜头猛地拉开
      hitStop(0.03, 0.12);
    }
  }

  /** 1 / 2 键：把盘直接传给对应队友，必定到达——除非有防守者站在传球线路上 */
  function guidedPass(slot: 1 | 2): void {
    const target = agents[slot];
    handPos(user, _hp);
    disc.pos.copy(_hp);
    disc.vel.set(0, 0, 0);
    disc.curve = 0;
    disc.mode = 'flying';
    disc.throwerId = user.id;
    disc.throwTeam = user.team;
    disc.flightTime = 0;
    disc.dead = false;
    disc.deadReason = null;
    disc.guidedTarget = target.id;
    disc.landing.set(target.pos.x, 0, target.pos.z);
    afterThrow(user);
    swingT = 0.22;
    swingSign = 1;
  }

  function stepGuided(dt: number): void {
    const t = agents[disc.guidedTarget];
    disc.flightTime += dt;
    world.landing.set(t.pos.x, 0, t.pos.z);
    // 防守者贴近盘的航线（= 站在传球人与队友的连线上）：
    //  · 离传球人 2m 内的是盯防者——只有概率碰到（见 rollMarkers），碰到后一半截获、一半拍落
    //  · 2m 以外站在线上的——必定截获
    const thrower = agents[disc.throwerId];
    for (const o of agents) {
      if (o.team === disc.throwTeam) continue;
      if (ignoreDef.has(o.id) && disc.flightTime < 0.35) continue;
      if (Math.hypot(o.pos.x - disc.pos.x, o.pos.z - disc.pos.z) >= LANE_BLOCK_R) continue;
      const isMarker = Math.hypot(o.pos.x - thrower.pos.x, o.pos.z - thrower.pos.z) < MARKER_ZONE;
      if (isMarker && Math.random() < 0.5) {
        knockDown('block');
        return;
      }
      toastTurnover('intercept', o.team);
      chain = 0;
      hitStop(0.12, 0.3);
      giveDisc(o);
      pickupReadyAt = world.time + 0.25;
      return;
    }
    _tg.set(t.pos.x, 1.3, t.pos.z);
    _dir.copy(_tg).sub(disc.pos);
    const dist = _dir.length();
    const step = GUIDED_SPEED * dt;
    if (dist <= step + 0.3 || disc.flightTime > 4) {
      completeCatch(t);
      return;
    }
    _dir.multiplyScalar(1 / dist);
    disc.pos.addScaledVector(_dir, step);
  }

  /** 开盘时按 1 / 2：交给队友 A / B 来开盘 */
  function delegatePull(slot: 1 | 2): void {
    const mate = agents[slot];
    charging = false;
    charge = 0;
    giveDisc(mate);
    rules.stopStall();
    mate.throwT = 0.8;
    bus.emit('toast', { title: 'toast.pullby.t', sub: '', params: { who: slot === 1 ? '@name.mateA' : '@name.mateB' }, kind: 'info' });
  }

  function handleUserThrow(dt: number, holding: boolean): void {
    const inp = input.state;
    const slot = pendingPass;
    pendingPass = 0;
    if (!holding || world.frozen || rules.phase !== 'playing') {
      charging = false;
      charge = 0;
    } else if (slot && world.time >= pickupReadyAt) {
      charging = false;
      charge = 0;
      if (world.pullPending) delegatePull(slot);
      else guidedPass(slot);
    } else {
      if (inp.pressed && world.time >= pickupReadyAt) {
        charging = true;
        charge = 0;
      }
      if (charging) {
        if (inp.released) doUserThrow();
        else if (!inp.mouseDown) {
          charging = false;
          charge = 0;
        } else charge = Math.min(1, charge + dt / 1.1);
      }
    }
    inp.pressed = false;
    inp.released = false;
  }

  /* ───────── 规则事件 ───────── */
  function handleRule(e: RuleEvent): void {
    switch (e.type) {
      case 'stall': {
        const h = world.holder;
        if (h && disc.mode === 'held') {
          doTurnover('stall', otherTeam(h.team), restartSpot(h.pos.x, h.pos.z), Math.abs(h.pos.z) > GOAL_Z ? ZONE_NOTE : '');
        }
        break;
      }
      case 'score': {
        world.frozen = true;
        hitStop(0.35, 0.7);
        const mine = e.team === 0;
        bus.emit('toast', {
          title: mine ? 'toast.score.me.t' : 'toast.score.opp.t',
          sub: mine ? 'toast.score.me.s' : 'toast.score.opp.s',
          kind: mine ? 'score' : 'bad',
        });
        emitHud();
        break;
      }
      case 'nextPoint': {
        setupPoint(e.offense, 2.0);
        bus.emit('toast', { title: 'toast.next.t', sub: 'toast.next.s', kind: 'info' });
        break;
      }
      case 'gameover': {
        world.frozen = true;
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        bus.emit('gameover', {
          win: e.winner === 0,
          scoreA: rules.score[0],
          scoreB: rules.score[1],
          spirit: spiritScore(),
          calls: { ...spirit },
        });
        break;
      }
    }
  }

  function onLock(locked: boolean): void {
    if (disposed) return;
    if (locked) {
      paused = false;
      last = performance.now();
      if (rules.phase === 'ready') {
        rules.begin();
        if (!world.pullPending) rules.startStall();
        pickupReadyAt = world.time + 0.3;
      }
      bus.emit('resume', undefined);
    } else if (rules.phase !== 'gameover') {
      paused = true;
      bus.emit('pause', undefined);
    }
  }

  /* ───────── 跨步 / 假动作 ───────── */
  function userCanMove(): boolean {
    return world.holder === user && disc.mode === 'held' && !world.pullPending && !world.frozen && rules.phase === 'playing';
  }

  /** A / D：轴心脚不动，另一只脚向侧面跨一步，绕开盯防者 */
  function doStep(dir: -1 | 1): void {
    if (!userCanMove()) return;
    stepDir = dir;
    stepT = 0.8;
    tutSkillAt = world.time;
    coach('stepout', 40);
  }

  /** V：假动作。盯防者可能上当（概率见 prob.ts），上当后约 0.9 秒内更难碰到盘 */
  function doFake(): void {
    if (!userCanMove() || world.time < fakeCD) return;
    fakeCD = world.time + 0.7;
    fakeT = 0.35;
    tutSkillAt = world.time;
    while (fakeLog.length && world.time - fakeLog[0] > 4) fakeLog.shift();
    const recent = fakeLog.length;
    fakeLog.push(world.time);
    let any = false;
    let bit = false;
    for (const o of agents) {
      if (o.team === 0 || o.isUser) continue;
      if (Math.hypot(o.pos.x - user.pos.x, o.pos.z - user.pos.z) > MARKER_ZONE + 0.8) continue;
      any = true;
      if (Math.random() < biteProb(o.skill, recent)) {
        bit = true;
        o.biteUntil = world.time + 0.9;
        const s = Math.random() < 0.5 ? -2.4 : 2.4; // 被骗得往一侧一晃
        o.vel.x += Math.cos(control.yaw) * s;
        o.vel.z += -Math.sin(control.yaw) * s;
      }
    }
    coach('fake', 40);
    if (any) {
      bus.emit('toast', {
        title: bit ? 'fake.bite.t' : 'fake.nobite.t',
        sub: bit ? 'fake.bite.s' : 'fake.nobite.s',
        kind: bit ? 'good' : 'info',
      });
    }
  }

  /* ───────── 新手教程：7 步，每步一个目标，失败自动重来 ───────── */
  function setupTutStep(n: number): void {
    if (!tut) return;
    tut.step = n;
    tut.stepDone = false;
    tut.advanceT = 0;
    tut.retryT = 0;
    tut.resetIn = 0;
    tut.timer = 0;
    tut.moved = 0;
    tut.yawSum = 0;
    tut.thrown = false;
    tut.staged = false;
    tut.warned = false;
    tut.hinted = false;
    tutSkillAt = -99;
    rules.begin();
    world.frozen = false;
    world.readyT = 0;
    world.pullPending = false;
    world.pulling = false;
    world.loose = false;
    world.passive = true;
    world.force = [-1, -1];
    disc.dead = false;
    disc.deadReason = null;
    disc.guidedTarget = -1;
    contest = null;
    charging = false;
    charge = 0;
    stepT = 0;
    ignoreDef.clear();
    viols.length = 0;
    for (const a of agents) {
      a.vel.set(0, 0, 0);
      a.cheat = 0;
      a.biteUntil = 0;
    }
    // 默认站位：玩家在己方半场面朝对方得分区，对手远远站在对面
    user.pos.set(0, 0, -15);
    user.yaw = Math.PI;
    control.yaw = Math.PI;
    control.pitch = 0;
    agents[1].pos.set(-7, 0, -6);
    agents[2].pos.set(7, 0, -4);
    agents[3].pos.set(-6, 0, 36);
    agents[4].pos.set(0, 0, 37);
    agents[5].pos.set(6, 0, 36);
    let holder: Agent = user;
    switch (n) {
      case 1:
        holder = agents[1];
        break;
      case 2:
        holder = agents[1];
        agents[1].pos.set(-6, 0, -8);
        user.pos.set(2, 0, -16);
        break;
      case 3:
        user.pos.set(0, 0, -10);
        agents[1].pos.set(-7, 0, -2);
        agents[2].pos.set(7, 0, 0);
        break;
      case 4:
        user.pos.set(0, 0, -10);
        agents[1].pos.set(-8, 0, 4);
        agents[2].pos.set(8, 0, 6);
        break;
      case 5:
        user.pos.set(0, 0, -5);
        agents[1].pos.set(-8, 0, 3);
        agents[2].pos.set(8, 0, 5);
        agents[3].pos.set(0.4, 0, -4.05); // 盯防者就站在面前
        agents[4].pos.set(-6, 0, 40);
        agents[5].pos.set(6, 0, 40);
        break;
      case 6:
        user.pos.set(0, 0, 12);
        agents[1].pos.set(3, 0, 33); // 队友 A 已经站在得分区里
        agents[2].pos.set(-6, 0, 22);
        break;
      default:
        user.pos.set(0, 0, -8);
        agents[1].pos.set(-7, 0, 0);
        agents[2].pos.set(7, 0, 2);
        agents[3].pos.set(0.4, 0, -7.05);
        break;
    }
    giveDisc(holder);
    for (const a of agents) a.cheat = 0;
    pickupReadyAt = world.time;
    tutLastX = user.pos.x;
    tutLastZ = user.pos.z;
    tutLastYaw = control.yaw;
    emitHud();
  }

  function tutDone(): void {
    if (!tut || tut.stepDone) return;
    tut.stepDone = true;
    tut.advanceT = 1.6;
    bus.emit('toast', { title: 'tut.ok.t', sub: '', kind: 'good' });
  }

  function tutFinish(): void {
    tut = null;
    world.passive = false;
    for (const id of ['pivot', 'stepout', 'fake', 'marker', 'force', 'throws', 'zone', 'spirit']) bus.emit('codex', { id });
    bus.emit('tutorialDone', undefined);
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  function tutSkip(): void {
    if (!tut) return;
    if (tut.step >= TUT_TOTAL) tutFinish();
    else setupTutStep(tut.step + 1);
  }

  function tutOnCatch(a: Agent, thrower: number, wasGuided: boolean, scoring: boolean): void {
    if (!tut || tut.stepDone) return;
    const mate = a.id === 1 || a.id === 2;
    switch (tut.step) {
      case 2:
        if (a === user) tutDone();
        break;
      case 3:
        if (thrower === 0 && wasGuided && mate) tutDone();
        break;
      case 4:
        if (thrower === 0 && !wasGuided && mate) tutDone();
        break;
      case 5:
        if (thrower === 0 && mate) {
          if (world.time - tutSkillAt < 6) tutDone();
          else {
            bus.emit('toast', { title: 'tut.hint.t', sub: 'tut.hint.s', kind: 'info' });
            tut.resetIn = 1.6; // 没用技巧就传成了：重来一次，这次练跨步 / 假动作
          }
        }
        break;
      case 6:
        if (scoring) tutDone();
        break;
    }
  }

  function tutUpdate(dt: number): void {
    if (!tut) return;
    tut.timer += dt;
    if (tut.resetIn > 0) {
      tut.resetIn -= dt;
      if (tut.resetIn <= 0) setupTutStep(tut.step);
      return;
    }
    if (tut.stepDone) {
      tut.advanceT -= dt;
      if (tut.advanceT <= 0) {
        if (tut.step >= TUT_TOTAL) tutFinish();
        else setupTutStep(tut.step + 1);
      }
      return;
    }
    if (tut.step === 1) {
      tut.moved += Math.hypot(user.pos.x - tutLastX, user.pos.z - tutLastZ);
      tut.yawSum += Math.abs(control.yaw - tutLastYaw);
      tutLastX = user.pos.x;
      tutLastZ = user.pos.z;
      tutLastYaw = control.yaw;
      if (tut.moved > 6 && tut.yawSum > 2.5) tutDone();
    } else if (tut.step === 2) {
      if (!tut.thrown && tut.timer > 1.5 && world.holder === agents[1] && disc.mode === 'held') {
        tut.thrown = true;
        hooks.throwTo(agents[1], user); // 队友把盘传给你：看落点圈
      }
    } else if (tut.step === 7) {
      if (world.holder !== user) {
        // 把盘传走了：这一步要拿着盘等对手违规。提示一下，然后重来
        if (!tut.warned) {
          tut.warned = true;
          bus.emit('toast', { title: 'tut.hold.t', sub: 'tut.hold.s', kind: 'info' });
        }
        tut.retryT += dt;
        if (tut.retryT > 1.8) setupTutStep(7);
        return;
      }
      if (tut.staged && !tut.hinted && tut.timer > 3.5) {
        tut.hinted = true; // 一直没喊：给个明确的提示
        bus.emit('toast', { title: 'tut.hint7.t', sub: 'tut.hint7.s', kind: 'info' });
      }
      if (!tut.staged && tut.timer > 1.2) {
        tut.staged = true;
        tut.timer = 0;
        agents[4].pos.set(user.pos.x + 1.6, 0, user.pos.z + 0.8); // 第二个防守者贴上来：双防
        logViolation('double', agents[4]);
      } else if (tut.staged && viols.every((v) => v.done) && tut.timer > 9) {
        tut.staged = false; // 没喊：再来一次
        tut.hinted = false;
        tut.timer = 0;
        agents[4].pos.set(-3, 0, -2);
      }
    }
    // 失败重来：盘落地 / 被拦截
    if (tut.step !== 1 && (world.loose || (world.holder && world.holder.team === 1))) {
      tut.retryT += dt;
      if (tut.retryT > 1.3) setupTutStep(tut.step);
    }
  }

  /* ───────── 自裁判：看见违规，自己喊 ───────── */
  const violWindow = () => (tut ? 8 : 3.5); // 教程里给更长的时间去发现违规
  const spiritScore = () => clamp(6 + spirit.correct + 2 * spirit.self - spirit.wrong - spirit.missed, 0, 10);

  function logViolation(type: ViolationType, who: Agent): void {
    viols.push({ type, id: who.id, at: world.time, done: false });
    bus.emit('codex', { id: type === 'double' ? 'double' : type === 'travel' ? 'travel' : 'contact' });
    if (type === 'self-contact') coach('self-contact-now', 10);
  }

  function pushAway(a: Agent, from: { x: number; z: number }, dist: number): void {
    const dx = a.pos.x - from.x;
    const dz = a.pos.z - from.z;
    const l = Math.hypot(dx, dz) || 1;
    a.pos.x += (dx / l) * dist;
    a.pos.z += (dz / l) * dist;
    clampToField(a.pos);
    a.vel.set(0, 0, 0);
  }

  /** 持盘者（玩家）身上还没被喊出的防守方贴身犯规：犯规者此刻必须还贴在玩家身边（犯规影响了出手） */
  function activeContactFoulOnUser(): (typeof viols)[number] | undefined {
    return viols.find((v) => {
      if (v.done || v.type !== 'contact' || world.time - v.at > violWindow()) return false;
      const o = agents[v.id];
      return o.team === 1 && Math.hypot(o.pos.x - user.pos.x, o.pos.z - user.pos.z) < 0.8;
    });
  }

  /** 传球已经或必定换攻：盘落地 / 被对手拿到 / 被拍落正在掉下来 */
  const turnoverNow = (): boolean =>
    !world.pullPending &&
    (world.loose || (world.holder !== null && world.holder.team === 1) || (disc.mode === 'flying' && disc.dead));

  /** 回盘：撤销这次换攻，把盘判回原持盘者的出手点，数秒从 1 重数 */
  function returnDiscToThrower(spot: { x: number; z: number }): void {
    user.pos.set(spot.x, 0, spot.z);
    clampToField(user.pos);
    giveDisc(user);
    for (const a of agents) a.cheat = 0; // 刚回盘别立刻又来一次随机犯规
    rules.stallElapsed = 0;
    world.stallElapsed = 0;
    chain = 0;
    pickupReadyAt = world.time + 0.3;
    throwFoul = null;
  }

  /** F：喊违规。喊对加分并让违规方退开；没有违规就是乱喊，扣分
   *  数秒怎么恢复按 WFDF 规则，不是一律重数：
   *  · 双防（盯防违例 18.1.3）：数秒减 2 秒继续
   *  · 带盘走（18.2.5）：回到原地，数秒从暂停处继续
   *  · 防守方贴身犯规（17.6）：数秒从 1 重数；若犯规时传出的球被换攻 → 盘回到传球者
   *  · 自己的犯规（进攻方，9.5.2）：数秒最多回到 9，不会因为犯规反而多出时间 */
  function callFoul(): void {
    if (rules.phase !== 'playing' || world.frozen || world.time < callCD) return;
    bus.emit('codex', { id: 'spirit' });
    const open = (x: (typeof viols)[number]) => !x.done && world.time - x.at <= violWindow();
    // 有「被犯规时出手」的传球时，优先处理那次贴身犯规
    const v =
      (throwFoul ? viols.find((x) => open(x) && x.type === 'contact' && agents[x.id].team === 1) : undefined) ??
      viols.find(open);
    if (!v) {
      if (tut) {
        bus.emit('toast', { title: 'tut.early.t', sub: 'tut.early.s', kind: 'info' });
        return;
      }
      spirit.wrong++;
      callCD = world.time + 4;
      bus.emit('toast', { title: 'call.wrong.t', sub: 'call.wrong.s', kind: 'bad' });
      emitHud();
      return;
    }
    v.done = true;
    callCD = world.time + 1.5;
    hitStop(0.08, 0.15);

    // 严重犯规回盘（WFDF 17.6）：被贴身犯规时出手的传球
    //  · 已经被断 / 拍落 / 掉地 → 撤销换攻，盘回到传球者，数秒从 1 重数
    //  · 盘还在空中 → 等结果：失误就回盘，传成了结果成立
    //  · 已经传成 → 结果成立
    if (
      !tut &&
      v.type === 'contact' &&
      throwFoul &&
      v.at <= throwFoul.at && // 犯规发生在出手之前，才算影响了这次传球
      world.holder !== user &&
      world.time - throwFoul.at <= violWindow()
    ) {
      spirit.correct++;
      agents[v.id].cheat = 0;
      if (turnoverNow()) {
        returnDiscToThrower(throwFoul.spot);
        bus.emit('toast', { title: 'call.ok.contactReturn.t', sub: 'call.ok.contactReturn.s', kind: 'good' });
      } else if (disc.mode === 'flying') {
        throwFoul.called = true;
        bus.emit('toast', { title: 'call.ok.contactReturn.t', sub: 'call.ok.contactAir.s', kind: 'info' });
      } else {
        throwFoul = null;
        bus.emit('toast', { title: 'call.ok.contactReturn.t', sub: 'call.ok.contactStands.s', kind: 'info' });
      }
      emitHud();
      return;
    }

    if (v.type === 'self-contact') {
      spirit.self++;
      rules.stallElapsed = Math.min(rules.stallElapsed, 9); // 进攻方犯规：数秒最多回到 9
      let near: Agent | null = null;
      let nd = Infinity;
      for (const o of agents) {
        if (o.team === 0) continue;
        const d = Math.hypot(o.pos.x - user.pos.x, o.pos.z - user.pos.z);
        if (d < nd) {
          nd = d;
          near = o;
        }
      }
      if (near) pushAway(user, near.pos, 2);
      bus.emit('toast', { title: 'call.ok.selfContact.t', sub: 'call.ok.selfContact.s', kind: 'good' });
    } else {
      spirit.correct++;
      const culprit = agents[v.id];
      if (v.type === 'travel') {
        culprit.pos.set(culprit.ox, 0, culprit.oz); // 回到原地；数秒不重数，从暂停处继续
      } else {
        const from = world.holder ? world.holder.pos : user.pos; // 多出来的人退开
        pushAway(culprit, from, 3.5);
        if (v.type === 'double') rules.stallElapsed = Math.max(0, rules.stallElapsed - 2); // 盯防违例：减 2 秒
        else rules.stallElapsed = 0; // 防守方贴身犯规：从 1 重数
      }
      culprit.cheat = 0;
      const key = v.type === 'double' ? 'double' : v.type === 'travel' ? 'travel' : 'contact';
      bus.emit('toast', { title: `call.ok.${key}.t`, sub: `call.ok.${key}.s`, kind: 'good' });
    }
    if (tut && tut.step === 7 && !tut.stepDone) tutDone();
    emitHud();
  }

  /** 传球线路：0 = 干净，1 = 盯防者在线路附近（有概率被碰到），2 = 有人站在线上（必被截） */
  function laneState(from: Agent, to: Agent): 0 | 1 | 2 {
    const dx = to.pos.x - from.pos.x;
    const dz = to.pos.z - from.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    let state: 0 | 1 | 2 = 0;
    for (const o of agents) {
      if (o.team === from.team) continue;
      const rx = o.pos.x - from.pos.x;
      const rz = o.pos.z - from.pos.z;
      const along = rx * ux + rz * uz;
      const perp = Math.abs(rx * uz - rz * ux);
      if (along > -0.3 && along <= MARKER_ZONE) {
        if (perp < 0.65 && state < 1) state = 1;
      } else if (along > MARKER_ZONE && along < len + 0.5 && perp < LANE_BLOCK_R) {
        state = 2;
      }
    }
    return state;
  }

  /* ───────── 规则提醒：只弹小卡片，不暂停、不影响比赛 ───────── */
  function coach(key: string, cool = 15): void {
    if (tut) return; // 教程有自己的提示卡
    if ((tipNext.get(key) ?? 0) > world.time) return;
    tipNext.set(key, world.time + cool);
    bus.emit('tip', { key });
  }

  function ruleCoach(userHolding: boolean): void {
    if (world.frozen || rules.phase !== 'playing') return;
    if (world.pullPending) {
      if (userHolding) {
        coach('pull', 40);
      } else if (world.offense === 0) {
        coach('pull-team', 40);
      } else {
        coach('receive', 40);
      }
      return;
    }
    const h = world.holder;
    if (h && disc.mode === 'held') {
      const near: { o: Agent; d: number }[] = [];
      for (const o of agents) {
        if (o.team === h.team) continue;
        const d = Math.hypot(o.pos.x - h.pos.x, o.pos.z - h.pos.z);
        if (d < STALL_RADIUS) near.push({ o, d });
      }
      near.sort((a, b) => a.d - b.d);
      // 双防：除盯防者外，另一名防守者在持盘者 3m 内，且没在盯别的进攻者
      if (near.length >= 2) {
        let doubled = false;
        for (let i = 1; i < near.length; i++) {
          const o = near[i].o;
          let guarding = false;
          for (const t of agents) {
            if (t.team === h.team && t !== h && Math.hypot(t.pos.x - o.pos.x, t.pos.z - o.pos.z) < STALL_RADIUS) {
              guarding = true;
              break;
            }
          }
          if (!guarding) {
            doubled = true;
            break;
          }
        }
        if (doubled) {
          if (h.team === 0) {
            coach('double-opp', 20);
          } else {
            coach('double-mine', 20);
          }
        }
      }
      if (h.team === 1 && near.length > 0 && near[0].o.isUser) {
        coach('marker', 30);
      }
      if (userHolding && stallNear && !prevStallNear && rules.stallActive) {
        coach('stall', 30);
      }
    }
    prevStallNear = stallNear;

    if (userHolding) {
      const k = input.state.keys;
      if (k.has('KeyW') || k.has('KeyS')) {
        coach('pivot', 25);
      }
      if (currentForce()) coach('force', 60);
      for (const m of [agents[1], agents[2]]) {
        const st = laneState(user, m);
        if (st === 2) {
          coach('lane', 30);
          break;
        }
        if (st === 1) {
          coach('lane-marker', 30);
        }
      }
    }
    for (const o of agents) {
      if (o === user) continue;
      if (Math.hypot(o.pos.x - user.pos.x, o.pos.z - user.pos.z) < 0.7) {
        coach('contact', 20);
        break;
      }
    }
    if (!userHolding && world.offense === 0 && inAttackZone(user.pos.z, rules.dirA)) {
      coach('zone', 40);
    }
  }

  /* ───────── 主更新 ───────── */
  function update(dt: number): void {
    if (rules.phase !== 'playing' && rules.phase !== 'scored') return;
    world.time += dt;
    if (tut) {
      rules.stopStall();
      tutUpdate(dt);
    }

    // 新一回合：先各就各位，再开盘；防守方回防冲刺
    if (world.readyT > 0) {
      world.readyT -= dt;
      if (world.readyT <= 0) {
        world.frozen = false;
        pickupReadyAt = world.time + 0.2;
        bus.emit('toast', { title: 'toast.go.t', sub: '', kind: 'info' });
      }
    }
    if (world.rush > 0 && !world.frozen) world.rush -= dt;

    // 数秒只在防守者贴近（3m 内）持盘者时才计时
    const holder = world.holder;
    stallNear = false;
    if (holder && disc.mode === 'held') {
      for (const o of agents) {
        if (o.team !== holder.team && Math.hypot(o.pos.x - holder.pos.x, o.pos.z - holder.pos.z) < STALL_RADIUS) {
          stallNear = true;
          break;
        }
      }
    }
    rules.update(dt, stallNear && !world.frozen); // 数秒 / 得分后倒计时（可能触发换攻或下一回合）
    world.stallElapsed = rules.stallElapsed;

    const userHolding = world.holder === user && disc.mode === 'held';
    updateUserMovement(control, user, input.state, userHolding, world.frozen, dt);
    handleUserThrow(dt, userHolding);

    if (world.holder && disc.mode === 'held') world.refPos.copy(world.holder.pos);
    updateAI(world, dt, hooks);

    // 飞盘落地后：进攻方的人走到盘旁边自动捡起
    if (world.loose && disc.mode === 'grounded' && !world.frozen) {
      for (const a of agents) {
        if (a.team !== world.pickupTeam) continue;
        if (Math.hypot(a.pos.x - disc.pos.x, a.pos.z - disc.pos.z) <= 0.9) {
          giveDisc(a);
          pickupReadyAt = world.time + 0.3;
          break;
        }
      }
    }

    ruleCoach(world.holder === user && disc.mode === 'held');

    // 违规的喊停窗口 3.5 秒：过期没喊就教学提示；玩家自己撞人没自喊 = 扣分
    for (const v of viols) {
      if (v.done || world.time - v.at <= violWindow()) continue;
      v.done = true;
      if (v.type === 'self-contact') spirit.missed++;
      coach(`miss-${v.type}`, 25);
    }
    if (viols.length > 40) viols.splice(0, 20);
    if (!world.frozen && rules.phase === 'playing' && !world.pullPending) {
      let touching = false;
      for (const o of agents) {
        if (o.team === 1 && Math.hypot(o.pos.x - user.pos.x, o.pos.z - user.pos.z) < 0.5) touching = true;
      }
      selfContactT = touching ? selfContactT + dt : 0;
      if (selfContactT > 0.4 && world.time > selfContactNext) {
        selfContactNext = world.time + 8;
        selfContactT = 0;
        logViolation('self-contact', user);
      }
    }

    if (disc.mode === 'held' && world.holder) {
      if (!world.holder.isUser) handPos(world.holder, disc.pos);
    } else if (disc.mode === 'flying') {
      if (disc.guidedTarget >= 0) {
        stepGuided(dt);
      } else {
        discAcc += dt;
        while (discAcc >= PHYS_STEP && disc.mode === 'flying') {
          discAcc -= PHYS_STEP;
          const landed = updateDisc(disc, PHYS_STEP);
          if (disc.mode !== 'flying') break;
          if (!disc.dead) trackContest();
          if (disc.mode !== 'flying') break;
          if (landed) {
            if (contest && !disc.dead) resolveContest();
            if (disc.mode === 'flying') onLanded();
          }
        }
        if (disc.mode !== 'flying') discAcc = 0;
      }
    }

    // 在空中就喊了传球犯规：盘一有结果就处理——失误则回盘，传成则结果成立
    if (throwFoul && throwFoul.called && (disc.mode !== 'flying' || disc.dead)) {
      if (turnoverNow()) {
        returnDiscToThrower(throwFoul.spot);
        bus.emit('toast', { title: 'call.ok.contactReturn.t', sub: 'call.ok.contactReturn.s', kind: 'good' });
      } else {
        throwFoul = null;
      }
    }
  }

  /* ───────── 画面更新 ───────── */
  const LANE_OK = 0x9dff4a;
  const LANE_BAD = 0xff4d4d;
  const LANE_RISK = 0xffd23f;

  function updateGuides(): void {
    const userHolding =
      world.holder === user && disc.mode === 'held' && !world.frozen && rules.phase === 'playing';
    laneLines.forEach((line, i) => {
      const mate = agents[i + 1];
      const showLane = userHolding && !world.pullPending;
      line.visible = showLane;
      if (!showLane) return;
      const st = laneState(user, mate);
      (line.material as THREE.MeshBasicMaterial).color.setHex(st === 2 ? LANE_BAD : st === 1 ? LANE_RISK : LANE_OK);
      _hp.set(user.pos.x, 1.0, user.pos.z);
      _lp.set(mate.pos.x, 1.2, mate.pos.z);
      line.position.copy(_hp).add(_lp).multiplyScalar(0.5);
      line.scale.set(1, 1, _hp.distanceTo(_lp));
      line.lookAt(_lp);
    });

    const show = userHolding && charging;
    arcDots.visible = show;
    ring.visible = show;
    if (show) {
      const power = Math.max(0.12, charge);
      const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * power;
      const cp = Math.cos(control.pitch);
      _dir.set(-Math.sin(control.yaw) * cp, Math.sin(control.pitch), -Math.cos(control.yaw) * cp);
      handPos(user, _hp);
      _vel.copy(_dir).multiplyScalar(speed);
      const { count } = simulateFlight(_hp, _vel, curve === 'backhand' ? -1 : 1, _land, trajArr);
      const step = Math.max(1, Math.floor(count / ARC_DOTS));
      let k = 0;
      for (let i = 4; i < count && k < ARC_DOTS; i += step, k++) {
        _m4.makeTranslation(trajArr[i * 3], trajArr[i * 3 + 1], trajArr[i * 3 + 2]);
        arcDots.setMatrixAt(k, _m4);
      }
      arcDots.count = k;
      arcDots.instanceMatrix.needsUpdate = true;
      ring.position.set(_land.x, 0.06, _land.z);
    }

    // 空中飞盘的落点：青色 = 我方传球（接它），红色 = 对手传球（拦它），灰色 = 会出界
    const inAir = disc.mode === 'flying' && disc.guidedTarget < 0 && !disc.dead;
    landRing.visible = inAir;
    landBeam.visible = inAir;
    if (inAir) {
      const out = Math.abs(world.landing.x) > FIELD_HALF_W || Math.abs(world.landing.z) > END_Z;
      const catchTeam = world.pulling ? otherTeam(disc.throwTeam) : disc.throwTeam;
      const color = out ? 0xb0b0b0 : catchTeam === 0 ? PALETTE.teamA : PALETTE.teamB;
      (landRing.material as THREE.MeshBasicMaterial).color.setHex(color);
      (landBeam.material as THREE.MeshBasicMaterial).color.setHex(color);
      const base = world.pulling
        ? catchTeam === 0 ? CATCH_R + 0.5 : CATCH_R
        : disc.throwTeam === 0 ? CATCH_R + 0.5 : DEF_REACH_AI + 0.3;
      const pulse = base * (1 + 0.07 * Math.sin(world.time * 9));
      landRing.scale.set(pulse, pulse, 1);
      landRing.position.set(world.landing.x, 0.07, world.landing.z);
      landBeam.position.set(world.landing.x, 3, world.landing.z);
    }
  }

  function frame(now: number): void {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const rawDt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const dt = Math.min(0.033, rawDt);
    if (!paused) {
      if (freezeT > 0) {
        freezeT -= rawDt; // 命中停顿：画面定格一瞬
      } else {
        update(dt);
        hudT += dt;
      }
    }
    const live = !paused && freezeT <= 0;
    const adt = live ? dt : 0;
    if (!userCanMove()) stepT = 0;
    if (stepT > 0) stepT = Math.max(0, stepT - adt);
    stepOff += ((stepT > 0 ? stepDir : 0) - stepOff) * Math.min(1, 10 * Math.max(adt, 0.001));
    if (fakeT > 0) fakeT = Math.max(0, fakeT - adt);
    if (live) animateAgents(agents, dt);
    syncAgents(agents);
    updateMarkers(world, world.time);
    updateGuides();

    // —— 相机：脚步起伏 / 转向侧倾 / 速度 FOV / 震动 ——
    const cam = ctx.camera;
    const yaw = control.yaw;
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const speed = Math.hypot(user.vel.x, user.vel.z);
    const sp = Math.min(1, speed / 7.6);
    bobPhase += speed * adt * 1.5;
    const strafe = (user.vel.x * rx + user.vel.z * rz) / 7.6;
    const yawRate = adt > 0 ? (yaw - prevYaw) / adt : 0;
    prevYaw = yaw;
    const targetRoll = -strafe * 0.04 + clamp(yawRate * 0.006, -0.035, 0.035);
    roll += (targetRoll - roll) * Math.min(1, 8 * Math.max(adt, 0.001));
    const bobY = Math.sin(bobPhase * 2) * 0.035 * sp;
    const bobX = Math.cos(bobPhase) * 0.022 * sp;
    fovPunch *= Math.pow(0.002, dt);
    shake *= Math.pow(0.0008, dt);
    const sx = (Math.random() - 0.5) * shake * 0.18;
    const sy = (Math.random() - 0.5) * shake * 0.18;
    const sr = (Math.random() - 0.5) * shake * 0.03;
    const lean = bobX + stepOff * 0.35; // 跨步时身体向侧面探出去
    cam.position.set(user.pos.x + rx * lean + sx, EYE_HEIGHT + bobY + sy, user.pos.z + rz * lean);
    cam.rotation.set(control.pitch + Math.sin(bobPhase * 2) * 0.004 * sp, yaw, roll + sr - stepOff * 0.03);
    const targetFov = 75 + sp * 9 + fovPunch;
    if (Math.abs(cam.fov - targetFov) > 0.02) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, 10 * dt);
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld(true);

    // —— 第一人称手臂 + 手里的飞盘 ——
    const holdingNow = world.holder === user && disc.mode === 'held';
    if (holdingNow && !wasHolding) armIn = 0;
    if (!holdingNow && wasHolding) disc.object.rotation.set(0, 0, 0);
    wasHolding = holdingNow;
    armIn = Math.min(1, armIn + adt * 5);
    if (swingT > 0) swingT = Math.max(0, swingT - adt);
    const showArm = holdingNow || swingT > 0;
    viewArm.group.visible = showArm;
    if (showArm) {
      let hx = 0.3 + 0.08 * charge;
      let hy = -0.27 + Math.sin(bobPhase * 2) * 0.012 - 0.55 * (1 - armIn) * (1 - armIn);
      let hz = -0.7 + 0.12 * charge; // 蓄力时手向后拉
      if (swingT > 0) {
        const p = 1 - swingT / 0.22; // 挥臂进度 0 → 1
        hx = swingSign > 0 ? 0.45 - 0.7 * p : -0.15 + 0.7 * p;
        hy = -0.28;
        hz = -0.62 - 0.25 * Math.sin(p * Math.PI);
      }
      if (fakeT > 0 && swingT <= 0) {
        const k = Math.sin((1 - fakeT / 0.35) * Math.PI); // 假动作：手臂做出传球的样子再收回
        hx += (curve === 'backhand' ? -0.25 : 0.25) * k;
        hz -= 0.22 * k;
      }
      viewArm.group.position.set(hx, hy, hz);
    }
    if (holdingNow) {
      _hp.set(viewArm.group.position.x, viewArm.group.position.y + 0.03, viewArm.group.position.z - 0.05);
      cam.localToWorld(_hp);
      disc.pos.copy(_hp);
    }
    syncDiscObject(disc, adt, holdingNow);
    if (holdingNow) {
      disc.object.quaternion.copy(cam.quaternion);
      disc.object.rotateX(0.5);
      disc.object.scale.setScalar(0.42);
    } else {
      disc.object.scale.setScalar(1);
    }

    // —— 飞盘拖尾：高速传球（>19 m/s）变金色 ——
    if (live) {
      const flying = disc.mode === 'flying' && !disc.dead;
      const hot = disc.vel.length() > 19;
      updateTrail(trail, disc, flying, hot ? PALETTE.disc : disc.throwTeam === 0 ? PALETTE.teamA : PALETTE.teamB, cam.position);
    }

    ctx.renderer.render(ctx.scene, cam);
    if (!paused && hudT > 0.066) {
      hudT = 0;
      emitHud();
    }
  }

  /* ───────── 对外接口 ───────── */
  setupPoint(1); // 对手先接盘，所以第一分由你们开盘
  emitHud();
  raf = requestAnimationFrame(frame);

  return {
    bus,
    requestLock() {
      const p: unknown = canvas.requestPointerLock();
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => undefined);
    },
    debug: {
      scenario() {
        // 玩家持盘，盯防者站在面前，两个队友在前方跑位
        rules.begin();
        world.frozen = false;
        world.readyT = 0;
        world.pullPending = false;
        user.pos.set(0, 0, 0);
        user.yaw = Math.PI;
        control.yaw = Math.PI;
        control.pitch = 0;
        agents[1].pos.set(-7, 0, 8);
        agents[2].pos.set(7, 0, 10);
        agents[3].pos.set(0.5, 0, 0.95);
        agents[4].pos.set(-7, 0, 9);
        agents[5].pos.set(7, 0, 11);
        for (const a of agents) a.vel.set(0, 0, 0);
        giveDisc(user);
        for (const a of agents) a.cheat = 0; // 测试时别随机犯规
        pickupReadyAt = world.time;
        emitHud();
      },
      violate(type) {
        logViolation(type, type === 'self-contact' ? user : agents[4]);
      },
    },
    startTutorial() {
      rules.reset();
      tipNext.clear();
      guide = false;
      spirit.correct = spirit.wrong = spirit.self = spirit.missed = 0;
      tut = { step: 1, stepDone: false, advanceT: 0, retryT: 0, resetIn: 0, timer: 0, moved: 0, yawSum: 0, thrown: false, staged: false, warned: false, hinted: false };
      setupTutStep(1);
      paused = true;
      emitHud();
    },
    restart() {
      tut = null;
      world.passive = false;
      spirit.correct = spirit.wrong = spirit.self = spirit.missed = 0;
      viols.length = 0;
      callCD = 0;
      rules.reset();
      tipNext.clear();
      guide = true;
      setupPoint(1);
      paused = true;
      emitHud();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      input.dispose();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      bus.clear();
      ctx.dispose();
    },
  };
}
