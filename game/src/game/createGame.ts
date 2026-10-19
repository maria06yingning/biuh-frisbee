import * as THREE from 'three';
import { createScene } from './createScene';
import { createField } from './createField';
import {
  assignMarks,
  createPlayers,
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
  launchDisc,
  simulateFlight,
  solveAim,
  syncDiscObject,
  throwDisc,
  updateDisc,
} from './disc';
import { Rules, inAttackZone, isOutOfBounds, restartSpot, type RuleEvent } from './rules';
import {
  Emitter,
  END_Z,
  FIELD_HALF_W,
  GOAL_Z,
  HAND_HEIGHT,
  EYE_HEIGHT,
  LANE_BLOCK_R,
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
  type World,
} from './types';

const CATCH_R = 1.15; // 进攻方接盘半径
const DEF_REACH = 0.75; // 防守者拦截半径（明显小于接盘半径）
const ZONE_NOTE = ' · 回到得分线发盘';
const GUIDED_SPEED = 18; // 按键定向传球的飞行速度 m/s
const CONTEST_WINDOW = 0.12; // 争抢窗口（秒）：窗口内取每个人最近距离再判定
const TRAJ_N = 150;
const clamp = THREE.MathUtils.clamp;

export interface GameHandle {
  bus: Emitter<GameEvents>;
  /** 必须在用户点击事件里调用（浏览器要求手势才能锁定鼠标） */
  requestLock(): void;
  restart(): void;
  dispose(): void;
}

const REASON_TEXT: Record<TurnoverReason, { lose: [string, string]; gain: [string, string] }> = {
  intercept: {
    lose: ['被拦截！', '传球被对手半路截获，攻防转换'],
    gain: ['拦截成功！', '半路截获了对手的传球，现在轮到你们进攻'],
  },
  block: {
    lose: ['被封堵！', '传球被防守者拍落，飞盘落地换攻'],
    gain: ['封堵成功！', '防守者拍落了飞盘，换你们进攻'],
  },
  ground: {
    lose: ['落地失误！', '飞盘没人接住落地，对方在落点持盘'],
    gain: ['对手失误！', '飞盘落地没人接，你们在落点接管进攻'],
  },
  out: {
    lose: ['出界！', '飞盘飞出边界，对方在边线内侧持盘'],
    gain: ['对手传球出界！', '飞盘出界，你们在边线内侧持盘'],
  },
  stall: {
    lose: ['数秒超时！', '持盘超过 10 秒没传出，攻防转换'],
    gain: ['对手数秒超时！', '对手持盘超过 10 秒，换你们进攻'],
  },
  drop: {
    lose: ['掉盘！', '接盘失误，飞盘落地，攻防转换'],
    gain: ['对手掉盘！', '对手没接稳，飞盘落地，换你们进攻'],
  },
};

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
  const tipNext = new Map<string, number>(); // 规则提醒的冷却

  const _hp = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _vel = new THREE.Vector3();
  const _land = new THREE.Vector3();
  const _tg = new THREE.Vector3();
  const aim = { dir: new THREE.Vector3(), speed: 0 };

  const rules = new Rules(handleRule);

  /* ───────── 场景内的"判断辅助"：传球线路 / 预测落点 ───────── */
  const laneLines = [1, 2].map(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const l = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.7 }),
    );
    l.visible = false;
    l.frustumCulled = false;
    ctx.scene.add(l);
    return l;
  });
  const trajArr = new Float32Array(TRAJ_N * 3);
  const trajGeo = new THREE.BufferGeometry();
  trajGeo.setAttribute('position', new THREE.BufferAttribute(trajArr, 3));
  trajGeo.setDrawRange(0, 0);
  const trajLine = new THREE.Line(trajGeo, new THREE.LineBasicMaterial({ color: 0xfff3a0 }));
  trajLine.frustumCulled = false;
  trajLine.visible = false;
  ctx.scene.add(trajLine);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.72, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfff3a0,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ctx.scene.add(ring);

  // 空中飞盘的落点提示：地面圆圈（= 大致的接盘范围）+ 一根光柱
  const landRing = new THREE.Mesh(
    new THREE.RingGeometry(0.88, 1, 48),
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
    },
    onPass: (slot) => {
      pendingPass = slot;
    },
  });

  /* ───────── 工具 ───────── */
  function handPos(a: Agent, out: THREE.Vector3): THREE.Vector3 {
    const yaw = a.isUser ? control.yaw : a.yaw;
    return out.set(
      a.pos.x - Math.sin(yaw) * 0.5 + Math.cos(yaw) * 0.2,
      HAND_HEIGHT,
      a.pos.z - Math.cos(yaw) * 0.5 - Math.sin(yaw) * 0.2,
    );
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
        mine: disc.throwTeam === 0,
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
      charge: charging ? charge : 0,
      stallLeft: rules.stallActive && disc.mode === 'held' ? Math.max(0, 10 - rules.stallElapsed) : null,
      stallRunning: stallNear,
      stamina: control.stamina,
      exhausted: control.exhausted,
      curve,
      goalAngle: Math.atan2(gx * rx + gz * rz, gx * fx + gz * fz),
      guide,
      landing,
    };
  }

  /* ───────── 持盘 / 换攻 ───────── */
  function giveDisc(a: Agent): void {
    world.holder = a;
    world.loose = false;
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
  }

  function toastTurnover(reason: TurnoverReason, to: TeamId, note = ''): void {
    const gained = to === 0;
    const t = REASON_TEXT[reason][gained ? 'gain' : 'lose'];
    bus.emit('toast', { title: t[0], sub: t[1] + note, kind: gained ? 'good' : 'bad' });
  }

  /** 飞盘留在 spot 处，由 to 队的人跑过去捡（不再瞬移）；捡起前不数秒 */
  function doTurnover(reason: TurnoverReason, to: TeamId, spot: { x: number; z: number }, note = ''): void {
    disc.mode = 'grounded';
    disc.pos.set(spot.x, 0.03, spot.z);
    disc.vel.set(0, 0, 0);
    disc.dead = false;
    disc.deadReason = null;
    disc.guidedTarget = -1;
    world.holder = null;
    world.loose = true;
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
    toastTurnover(reason, to, note);
    if (note) {
      coach('zoneTO', '得分区内失误', '在得分区里丢盘，飞盘会回到最近的得分线上，由对方的人在线上捡盘重新开始。', 30);
    }
  }

  function setupPoint(offense: TeamId, delay = 0): void {
    const starter = resetFormation(agents, rules.dirA, offense);
    world.dirA = rules.dirA;
    world.frozen = delay > 0; // 新一回合先"各就各位"
    world.readyT = delay;
    world.rush = 10; // 防守方从自己的得分线冲回来
    field.setAttackZone(rules.dirA);
    contest = null;
    charge = 0;
    charging = false;
    discAcc = 0;
    control.yaw = user.yaw;
    control.pitch = 0;
    disc.mode = 'grounded';
    giveDisc(starter);
  }

  function afterThrow(thrower: Agent): void {
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
  }

  /* ───────── 接盘 / 拦截 / 封堵判定 ───────── */
  function trackContest(): void {
    for (const a of agents) {
      if (a.id === disc.throwerId && disc.flightTime < 0.35) continue;
      const mine = a.team === disc.throwTeam;
      const sprint = a.vel.lengthSq() > 20;
      // 接盘手够得远，防守者的拦截范围小得多
      const r = mine ? CATCH_R + (a.isUser ? 0.5 : 0) + (sprint ? 0.3 : 0) : DEF_REACH + (sprint ? 0.15 : 0);
      const yMin = mine ? 0.15 : 0.25;
      const yMax = mine ? 2.4 : 2.1;
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
    disc.dead = true;
    disc.deadReason = reason;
    disc.vel.multiplyScalar(0.25);
    disc.vel.y = -1.5;
  }

  /** 进攻方接到盘：转移控制权；在对方得分区内 = 得分 */
  function completeCatch(a: Agent): void {
    giveDisc(a);
    pickupReadyAt = world.time + 0.25;
    if (inAttackZone(a.pos.z, teamDir(rules.dirA, a.team))) rules.scorePoint(a.team);
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
      giveDisc(winner);
      pickupReadyAt = world.time + 0.25;
    } else {
      knockDown('block');
    }
  }

  function onLanded(): void {
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
      const flub = Math.random() < (to.isUser ? 0.05 : 0.15); // 传给玩家时更稳
      launchDisc(disc, _hp, from, aim.dir, aim.speed, 0, flub ? 0.09 : 0.012);
      afterThrow(from);
    },
  };

  /* ───────── 玩家投掷 ───────── */
  function doUserThrow(): void {
    const power = Math.max(0.12, charge);
    const cp = Math.cos(control.pitch);
    _dir.set(-Math.sin(control.yaw) * cp, Math.sin(control.pitch), -Math.cos(control.yaw) * cp);
    let noise = 0.012;
    noise += 0.07 * Math.max(0, (world.stallElapsed - 7) / 3); // 快数秒了手会抖
    if (power > 0.95) noise += 0.03; // 过度用力
    if (power < 0.15) noise += 0.02; // 软绵绵
    if (control.pitch > 0.6 || control.pitch < -0.12) noise += 0.03; // 仰角失当
    handPos(user, _hp);
    throwDisc(disc, _hp, user, power, _dir, curve === 'backhand' ? -1 : 1, noise);
    afterThrow(user);
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
  }

  function stepGuided(dt: number): void {
    const t = agents[disc.guidedTarget];
    disc.flightTime += dt;
    world.landing.set(t.pos.x, 0, t.pos.z);
    // 防守者贴近盘的航线（= 站在传球人与队友的连线上）→ 判定截获
    if (disc.flightTime > 0.12) {
      for (const o of agents) {
        if (o.team === disc.throwTeam) continue;
        if (Math.hypot(o.pos.x - disc.pos.x, o.pos.z - disc.pos.z) < LANE_BLOCK_R) {
          toastTurnover('intercept', o.team);
          giveDisc(o);
          pickupReadyAt = world.time + 0.25;
          return;
        }
      }
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
      guidedPass(slot);
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
        const mine = e.team === 0;
        bus.emit('toast', {
          title: mine ? '达阵得分！' : '对手得分',
          sub: mine ? '你们在得分区内接到了盘，+1 分' : '对手在得分区接到盘得分',
          kind: mine ? 'good' : 'bad',
        });
        emitHud();
        break;
      }
      case 'nextPoint': {
        setupPoint(e.offense, 2.0);
        bus.emit('toast', { title: '新一回合', sub: '双方换边，各回自己的得分线 · 金色区域是你们的进攻方向', kind: 'info' });
        break;
      }
      case 'gameover': {
        world.frozen = true;
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        bus.emit('gameover', { win: e.winner === 0, scoreA: rules.score[0], scoreB: rules.score[1] });
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
        rules.startStall();
        pickupReadyAt = world.time + 0.3;
      }
      bus.emit('resume', undefined);
    } else if (rules.phase !== 'gameover') {
      paused = true;
      bus.emit('pause', undefined);
    }
  }

  /* ───────── 规则提醒：只弹小卡片，不暂停、不影响比赛 ───────── */
  function coach(key: string, title: string, text: string, cool = 15): void {
    if ((tipNext.get(key) ?? 0) > world.time) return;
    tipNext.set(key, world.time + cool);
    bus.emit('tip', { key, title, text });
  }

  function ruleCoach(userHolding: boolean): void {
    if (world.frozen || rules.phase !== 'playing') return;
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
            coach('double-opp', '对手双防（Double Team）', '持盘者 3 米内只能有 1 名防守者（盯防者）。另一名防守者如果没在盯别的进攻者，就算双防——正式比赛里持盘者可以喊 "Double Team"，多出来的人要退开。这里只是提醒，不影响比赛。', 20);
          } else {
            coach('double-mine', '你们双防了', '对手持盘时，3 米内只该有 1 个盯防者。现在有两个人贴着持盘者、又没在盯别人——别扎堆，去盯其他进攻者或堵传球线路。', 20);
          }
        }
      }
      if (h.team === 1 && near.length > 0 && near[0].o.isUser) {
        coach('marker', '你是盯防者', '每个持盘者只有 1 名盯防者，由他来数秒。保持约 1 米距离，别碰到对方——极限飞盘没有身体接触。', 30);
      }
      if (userHolding && stallNear && !prevStallNear && rules.stallActive) {
        coach('stall', '开始数秒', '防守者贴到 3 米内就开始数秒：10 秒内必须传出，否则数秒超时、攻防转换。', 30);
      }
    }
    prevStallNear = stallNear;

    if (userHolding) {
      const k = input.state.keys;
      if (k.has('KeyW') || k.has('KeyA') || k.has('KeyS') || k.has('KeyD')) {
        coach('pivot', '轴心脚', '接盘后必须停下，只能以一只脚为轴转身，不能带盘跑。想摆脱防守，靠转身和假动作传盘。', 25);
      }
      for (const m of [agents[1], agents[2]]) {
        if (laneClearance(world, user.pos.x, user.pos.z, m.pos.x, m.pos.z, 0) < LANE_BLOCK_R) {
          coach('lane', '传球线路被堵', '红线上有防守者站在你和队友的连线上，传过去会被截。换另一个队友，或先转身等队友跑开。', 30);
          break;
        }
      }
    }
    for (const o of agents) {
      if (o === user) continue;
      if (Math.hypot(o.pos.x - user.pos.x, o.pos.z - user.pos.z) < 0.7) {
        coach('contact', '无身体接触', '极限飞盘不允许推、撞、抢；防守靠站位和手上的功夫。（本游戏没有碰撞推挤，但现实中要保持距离。）', 20);
        break;
      }
    }
    if (!userHolding && world.offense === 0 && inAttackZone(user.pos.z, rules.dirA)) {
      coach('zone', '得分区', '只有在对方得分区内接到盘才得分；在区里跑动、没接到盘不算。', 40);
    }
  }

  /* ───────── 主更新 ───────── */
  function update(dt: number): void {
    if (rules.phase !== 'playing' && rules.phase !== 'scored') return;
    world.time += dt;

    // 新一回合：先各就各位，再开盘；防守方回防冲刺
    if (world.readyT > 0) {
      world.readyT -= dt;
      if (world.readyT <= 0) {
        world.frozen = false;
        pickupReadyAt = world.time + 0.2;
        bus.emit('toast', { title: '开盘！', sub: '', kind: 'info' });
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

    if (disc.mode === 'held' && world.holder) {
      const h = world.holder;
      if (h.isUser) {
        const yaw = control.yaw;
        const back = 0.55 - 0.2 * charge;
        const side = 0.28 + 0.12 * charge;
        disc.pos.set(
          h.pos.x - Math.sin(yaw) * back + Math.cos(yaw) * side,
          1.3 - 0.15 * charge,
          h.pos.z - Math.cos(yaw) * back - Math.sin(yaw) * side,
        );
      } else {
        handPos(h, disc.pos);
      }
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
  }

  /* ───────── 画面更新 ───────── */
  function updateGuides(): void {
    const userHolding =
      world.holder === user && disc.mode === 'held' && !world.frozen && rules.phase === 'playing';
    laneLines.forEach((line, i) => {
      const mate = agents[i + 1];
      line.visible = userHolding;
      if (!userHolding) return;
      const clr = laneClearance(world, user.pos.x, user.pos.z, mate.pos.x, mate.pos.z, 0);
      (line.material as THREE.LineBasicMaterial).color.setHex(clr < LANE_BLOCK_R ? 0xff4d4d : 0x3ddc84);
      const attr = line.geometry.attributes.position as THREE.BufferAttribute;
      attr.setXYZ(0, user.pos.x, 1.0, user.pos.z);
      attr.setXYZ(1, mate.pos.x, 1.2, mate.pos.z);
      attr.needsUpdate = true;
    });
    const show = userHolding && charging;
    trajLine.visible = show;
    ring.visible = show;
    if (show) {
      const power = Math.max(0.12, charge);
      const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * power;
      const cp = Math.cos(control.pitch);
      _dir.set(-Math.sin(control.yaw) * cp, Math.sin(control.pitch), -Math.cos(control.yaw) * cp);
      handPos(user, _hp);
      _vel.copy(_dir).multiplyScalar(speed);
      const { count } = simulateFlight(_hp, _vel, curve === 'backhand' ? -1 : 1, _land, trajArr);
      trajGeo.setDrawRange(0, count);
      (trajGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      ring.position.set(_land.x, 0.06, _land.z);
    }

    const inAir = disc.mode === 'flying' && disc.guidedTarget < 0 && !disc.dead;
    landRing.visible = inAir;
    landBeam.visible = inAir;
    if (inAir) {
      const out = Math.abs(world.landing.x) > FIELD_HALF_W || Math.abs(world.landing.z) > END_Z;
      const color = out ? 0xb0b0b0 : disc.throwTeam === 0 ? 0x3ddc84 : 0xff4d4d;
      (landRing.material as THREE.MeshBasicMaterial).color.setHex(color);
      (landBeam.material as THREE.MeshBasicMaterial).color.setHex(color);
      const base = disc.throwTeam === 0 ? CATCH_R + 0.5 : DEF_REACH + 0.25;
      const pulse = base * (1 + 0.07 * Math.sin(world.time * 9));
      landRing.scale.set(pulse, pulse, 1);
      landRing.position.set(world.landing.x, 0.07, world.landing.z);
      landBeam.position.set(world.landing.x, 3, world.landing.z);
    }
  }

  function frame(now: number): void {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
    last = now;
    if (!paused) {
      update(dt);
      hudT += dt;
    }
    syncAgents(agents);
    updateMarkers(world, world.time);
    syncDiscObject(disc, dt);
    updateGuides();

    const cam = ctx.camera;
    cam.position.set(user.pos.x, EYE_HEIGHT, user.pos.z);
    cam.rotation.set(control.pitch, control.yaw, 0);
    const sprinting = input.state.keys.has('ShiftLeft') && user.vel.lengthSq() > 36;
    const targetFov = sprinting ? 80 : 75;
    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, 6 * dt);
      cam.updateProjectionMatrix();
    }

    ctx.renderer.render(ctx.scene, cam);
    if (!paused && hudT > 0.066) {
      hudT = 0;
      emitHud();
    }
  }

  /* ───────── 对外接口 ───────── */
  setupPoint(0);
  emitHud();
  raf = requestAnimationFrame(frame);

  return {
    bus,
    requestLock() {
      const p: unknown = canvas.requestPointerLock();
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => undefined);
    },
    restart() {
      rules.reset();
      tipNext.clear();
      guide = true;
      setupPoint(0);
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
