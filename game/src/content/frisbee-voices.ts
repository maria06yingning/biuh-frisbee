import type { Bi } from './shared';

/**
 * Add future community messages by appending one record here.
 * Keep `quote` as the full original; add `summary` only when the message is long.
 * Use the public name chosen by a real contributor. AI examples have no name
 * and must keep their explicit source label in the interface.
 */
export type FrisbeeVoice = {
  id: string;
  source: 'community' | 'ai';
  name?: string;
  topic: Bi;
  quote: Bi;
  summary?: Bi;
};

export const FRISBEE_VOICES: FrisbeeVoice[] = [
  {
    id: 'happy-weekend',
    source: 'community',
    name: '快乐周末',
    topic: ['和朋友在一起', 'Playing with friends'],
    quote: [
      '其实觉得飞盘真的很好玩，而且跟朋友玩超级热血超级有意思。\n不过其实最重要的还是朋友吧🤔有朋友在一起干啥都是有意思的hhhhh',
      'I really think ultimate is so much fun, and playing with friends is exciting. But maybe the most important thing is the friends themselves 🤔 If I have friends with me, anything is fun hahaha.',
    ],
  },
  {
    id: 'youxingran',
    source: 'community',
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
    source: 'community',
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
  {
    id: 'echo-community',
    source: 'community',
    name: 'Echo',
    topic: ['喜欢和大家在一起', 'I love being with this group'],
    quote: [
      '我感觉就是很喜欢这群人。',
      'I think I just really like these people.',
    ],
  },
  {
    id: 'ai-first-catch',
    source: 'ai',
    topic: ['第一次接住一张盘', 'A first catch'],
    quote: [
      '一开始我只敢站在边线看。有人把盘递给我，接住的那一刻，我突然觉得自己也属于这块草地。',
      'At first I only watched from the sideline. Someone passed me the disc, and the moment I caught it, I felt I belonged on the field too.',
    ],
  },
  {
    id: 'ai-clear-head',
    source: 'ai',
    topic: ['跑起来，暂时放下杂念', 'Run, and let the noise fade'],
    summary: [
      '跑起来以后，待办清单暂时安静了；眼里只剩队友的位置、飞盘的弧线，以及下一步能跑向哪里。',
      'Once the running starts, the to-do list goes quiet. There is only a teammate’s position, the disc’s arc and the next place to move.',
    ],
    quote: [
      '跑起来的时候，脑子里的待办清单好像都被风吹远了。眼里只剩下队友的位置、飞盘的弧线，以及下一步可以跑向哪里。一次次传盘和接盘之间，我好像重新找回了专注。',
      'When I start running, the to-do list in my head seems to drift away with the wind. I focus on where my teammates are, the disc’s arc, and where I can move next. Between one pass and the next catch, I find my focus again.',
    ],
  },
  {
    id: 'ai-look-up',
    source: 'ai',
    topic: ['一起抬头看盘', 'Looking up together'],
    quote: [
      '最喜欢盘飞出去之后，所有人一起抬头看它的那几秒。大家都在等它落向谁，也都在笑。',
      'My favourite seconds are just after the disc flies: everyone looks up together, waiting to see who will catch it, and smiling.',
    ],
  },
  {
    id: 'ai-make-space',
    source: 'ai',
    topic: ['给队友留出空间', 'Make room for a teammate'],
    summary: [
      '配合不必一开始就很熟练。及时回传、给队友拉开空当，进攻就会慢慢连起来。',
      'Teamwork does not have to be perfect from the start. A timely reset and a little space can help the whole attack connect.',
    ],
    quote: [
      '刚开始我以为自己要先变得很厉害，才有资格加入进攻。后来发现，一个及时的回传、一个给队友拉开的空当，也能让整次进攻变得更顺。大家不是等我完美才把盘传过来，而是边打边一起学会配合。',
      'At first, I thought I had to become really good before I could join the attack. Then I learned that a timely reset or making space for a teammate can help the whole play flow. Nobody waits for me to be perfect before passing; we learn to work together as we play.',
    ],
  },
  {
    id: 'ai-after-game',
    source: 'ai',
    topic: ['比分之外的小片刻', 'Beyond the score'],
    quote: [
      '一场比赛结束后，最留在脑子里的常常不是比分，而是有人喊了一声“好接”，还有大家一起收盘回家的路。',
      'After a game, the score is not always what stays with me. It might be someone calling “nice catch,” or the walk back while we pack up together.',
    ],
  },
  {
    id: 'maik-lauterbach',
    source: 'community',
    name: 'Maik Lauterbach',
    topic: ['三十年后仍然热爱', 'Still loving it after 30 years'],
    summary: [
      '从 1996 年开始打飞盘，三十年后仍深爱这项运动：速度、战术与团队协作令人着迷，而最难忘的，是每场比赛后与对手分享的尊重和友谊。',
      'After starting in 1996, he still loves the sport 30 years on: its pace, tactics and teamwork—and, above all, the respect and friendship shared with opponents after a game.',
    ],
    quote: [
      '我从 1996 年（没错！）开始打极限飞盘。即使三十年过去，这项运动仍在我心里占有特别的位置。最初吸引我的是传盘技巧、速度、战术和团队合作的独特结合。极限飞盘节奏快、强度高、充满活力。而你真正需要的，无非是一张飞盘、几个人和一块空地！\n\n但极限飞盘真正特别之处，在于飞盘精神。没有裁判，自己承担责任，尊重对手，同时仍为每一分全力拼搏——这是我一直很敬佩的。\n\n回想起来，我记得无数场锦标赛、激动人心的比赛、精彩的胜利和痛苦的失利。但我最深刻的记忆，并不关乎输赢，而是每场比赛结束后，和对手手挽手围成一圈。就在几分钟前，我们还在场上激烈交锋；此刻，我们分享着笑容、尊重与友谊。\n\n极限飞盘让我懂得，竞争和公平可以并行。体育最美好的部分，往往不是结果，而是与你共同经历这一切的人。对我而言，极限飞盘意味着热情、行动、团队精神、公平竞赛，最重要的是友谊。\n\n虽然我的竞技极限飞盘生涯已经过去，但我永远是一个心里热爱极限飞盘的队员。',
      'I started playing Ultimate Frisbee in 1996 (!), and even 30 years later, this sport still has a special place in my heart. What fascinated me from the beginning was the unique combination of throwing techniques, speed, tactics, and teamwork. Ultimate is fast, intense, and full of action. And all you really need is just a disc, a few people, and some space!\n\nBut what makes Ultimate truly special is the Spirit of the Game. Playing without referees, taking responsibility, respecting your opponents, and still fighting passionately for every point – that is something I have always admired.\n\nLooking back, I remember countless tournaments, exciting matches, great victories, and painful defeats. But my strongest memories are not about winning or losing. They are about standing in a circle after each game, arm in arm with our opponents. Just minutes before, we had been fighting hard against each other. Now we were sharing smiles, respect, and friendship.\n\nUltimate taught me that competition and fairness belong together. And that the best part of sports is often not the result, but the people you share the experience with. For me, Ultimate Frisbee means passion, action, team spirit, fair play, and above all, friendship.\n\nAlthough my days of playing competitive Ultimate are behind me, I will always be an Ultimate player at heart.',
    ],
  },
];
