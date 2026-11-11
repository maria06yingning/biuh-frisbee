import type { Bi } from './shared';

/**
 * Add future community messages by appending one record here.
 * Keep `quote` as the full original; add `summary` only when the message is long.
 * Use the name or nickname the contributor wants displayed publicly.
 */
export type FrisbeeVoice = {
  id: string;
  name: string;
  topic: Bi;
  quote: Bi;
  summary?: Bi;
};

export const FRISBEE_VOICES: FrisbeeVoice[] = [
  {
    id: 'happy-weekend',
    name: '快乐周末',
    topic: ['和朋友在一起', 'Playing with friends'],
    quote: [
      '其实觉得飞盘真的很好玩，而且跟朋友玩超级热血超级有意思。\n不过其实最重要的还是朋友吧🤔有朋友在一起干啥都是有意思的hhhhh',
      'I really think ultimate is so much fun, and playing with friends is exciting. But maybe the most important thing is the friends themselves 🤔 If I have friends with me, anything is fun hahaha.',
    ],
  },
  {
    id: 'youxingran',
    name: '悠星然',
    topic: ['专注接住一张盘', 'The focus of a catch'],
    summary: [
      '飞盘腾空后，世界像安静下来，视线只追随它，等它稳稳落进掌心；那一刻的快乐纯粹又治愈。',
      'Once the disc is in the air, the world seems to go quiet. All attention follows it until the catch, leaving a pure, healing joy.',
    ],
    quote: [
      '飞盘腾空而起的时候，整个世界好像自动静音了。\n我的视线死死锁住那枚在空中轻盈旋转的圆盘，风声、人声、周遭的热闹全部自动褪去。眼里、心里、注意力里，只剩下它一个落点。\n它在空中缓缓滑翔、盘旋、下坠，不慌不忙，像在慢慢奔赴一场专属的相遇。\n从它开始降落的那一刻，时间仿佛被拉得很慢、很温柔。我整个人高度专注，屏住呼吸，抬手、跟进、等待。\n直到飞盘稳稳落进掌心的那一瞬间——轻轻贴合、稳稳落定，那一刻真的有一种极致神圣又治愈的快乐。\n像接住了一片流动的风、接住了整片松弛的黄昏。所有杂念全部清零，只剩下纯粹、干净、彻底的愉悦。\n那一刻没有焦虑，没有纷扰，只有我和飞盘的双向奔赴，简单又热烈，特别治愈，特别好玩！而且感觉是一种非常纯粹的快乐，没有什么目的，只是在享受接住他和感受他的过程。',
      'When the disc lifts into the air, it feels as if the whole world goes quiet.\nMy eyes lock onto that light, spinning disc. The wind, the voices and all the bustle fade away. In my eyes, my heart and my attention, there is only its landing point.\nIt glides, circles and descends without hurry, as if it is slowly making its way toward a meeting meant just for us.\nFrom the moment it begins to fall, time seems to stretch—slow and gentle. I focus, hold my breath, raise my hand, follow and wait.\nThen the disc settles into my palm: a soft touch, a sure landing. That moment brings a joy that feels almost sacred and deeply healing.\nIt is like catching a moving breeze, or a whole relaxed evening sky. Every distraction disappears, leaving a clean, complete happiness.\nThere is no anxiety, no noise—just the disc and me finding each other. It is simple, warm, healing and so much fun: a pure kind of joy with no purpose beyond enjoying the catch and the feeling of the disc.',
    ],
  },
  {
    id: 'laura',
    name: 'Laura',
    topic: ['团队、社群与旅行', 'Team, community & travel'],
    summary: [
      '合作与团队感，以及比赛带来的同好、城市与场地体验，都是飞盘的吸引力。',
      'The appeal lies in the teamwork, and in meeting other players while discovering new cities and fields through competition.'
    ],
    quote: [
      'community bonding很强，是很注重合作意识和团队精神的运动。然后我觉得社交属性也挺大的，就是参加比赛可以认识很多打盘的人。还有就是可以一起去不同的城市、场地打比赛也很有意思',
      'The community bonding is strong. It is a sport that really values cooperation and team spirit. It also has a strong social side: you meet lots of other players at tournaments, and it is fun to travel together to different cities and fields.',
    ],
  },
];
