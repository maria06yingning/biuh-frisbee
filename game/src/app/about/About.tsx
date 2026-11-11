'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { CONTACT_EMAIL, pick, type Bi } from '@/content/shared';
import PageShell, { Section } from '@/components/PageShell';
import '@/styles/aero-about.css';

type Credit = { label: Bi; note: Bi; href?: string };
type CreditGroup = { heading: Bi; items: Credit[] };

const LETTER: Bi[] = [
  ['嗨，大家好，可以叫我 Maria。', 'Hi, everyone. You can call me Maria.'],
  ['今年是我打飞盘的第六年了。', 'This is my sixth year playing ultimate.'],
  ['很惭愧地说，在飞盘这个层面上，我似乎一直都在退步。技术真的远没有高中时期好了。当然，高中时期好像也没有特别好（笑）。', 'I’m a little embarrassed to admit that, as a player, I sometimes feel like I’ve been going backwards. My skills are nowhere near what they were in high school. Then again, I don’t think I was particularly good back then either (laughs).'],
  ['我好像一直都是这样的一个性格。因为对我来说，飞盘更多的意义可能是在于和朋友一起玩，和朋友待在一起，去享受那种自己在运动的感觉，享受身体发力的感觉。可能是因为这些东西本身对我来说，比比赛成绩或者技术水平要重要得多。', 'I think I’ve always been this kind of person. For me, ultimate is mostly about playing with friends, spending time together, and enjoying the feeling of moving my body—the feeling of putting force into a throw. Those things have probably mattered more to me than game results or technical level.'],
  ['当然，我有时候也会想，这会不会只是自己不够努力的借口。', 'Of course, sometimes I wonder whether that is just an excuse for not working hard enough.'],
  ['可能因为一直以来，我给自己的标签就是「三分钟热度」，总觉得自己做什么事情都很难真正坚持下去，也很难把一件事情做得特别深入。看到身边有很多很厉害的人，认真训练，不断进步，也取得了很好的成绩，我有时候也会问自己：为什么你好像做什么事都差一点？为什么不能成为那个真正厉害的人？', 'For a long time, I’ve labelled myself as someone who loses interest quickly. I’ve felt that it is hard for me to stick with anything or go deeply into it. When I see people around me train seriously, keep improving, and achieve great things, I sometimes ask myself: Why do I always fall just short? Why can’t I be the one who is truly good at this?'],
  ['但慢慢地，我开始觉得，喜欢一件事情好像不一定只有一种方式。也许我不需要一直想着自己是不是足够优秀，也不一定非要把一件事情做到多么极致，才能证明自己真的喜欢它。很多时候，比起得到别人的认可，更重要的可能是自己能不能真正喜欢正在做的事情。怎么样会让自己觉得舒服、开心，就怎么样去做吧。', 'Gradually, though, I’ve come to feel that there may not be just one way to love something. Maybe I don’t have to keep wondering if I’m good enough, or take something to the extreme to prove that I really love it. More often, what matters more than other people’s approval is whether I can truly enjoy what I’m doing. If a way of doing it feels comfortable and joyful to me, maybe that is the way I can choose.'],
  ['至少现在，我想试着按照自己的方式去喜欢飞盘。', 'At least for now, I want to try loving ultimate in my own way.'],
  ['怎么说呢，飞盘对于我来说，真的是青春中不可或缺的一个元素。', 'How can I put it? Ultimate has become an irreplaceable part of my youth.'],
  ['因为飞盘，我认识了很多人；因为飞盘，我开始思考自己的性格，也开始反问自己到底想要什么。它给我带来的东西远远不止一项运动本身。', 'Through ultimate, I’ve met so many people. It has made me think about my own character and ask myself what I really want. It has given me far more than a sport.'],
  ['虽然现在的我打盘可能打得不怎么样了，尤其是比赛成绩什么的，但有一件事我还是挺自豪的：我觉得自己可以在三分钟内教会一个人怎么上手飞盘。', 'I may not be playing particularly well these days, especially when it comes to competition results. But there is one thing I’m proud of: I think I can teach someone the basics of ultimate in three minutes.'],
  ['虽然只是最基础的传盘和接盘，但这套所谓的「三分钟上手法」，目前应该已经教会了五十多个人。他们可能是我的宿管、我的朋友、邻居家的小弟弟，还有各种各样偶然接触到飞盘的人。', 'It is only the most basic throwing and catching, but my so-called “Three-Minute Intro” has probably taught more than fifty people by now. They include my dorm supervisor, friends, my neighbour’s little brother, and all kinds of people who happened to encounter a flying disc.'],
  ['每次看到一个刚刚接触飞盘的人，成功接住一张盘，或者突然感受到这项运动的乐趣，脸上露出那种很开心的表情，我都会觉得特别特别满足。', 'Whenever I see someone new to the sport catch a disc successfully, or suddenly discover the fun of it and light up, I feel deeply satisfied.'],
  ['我希望或多或少，大家都能从这项运动中获得一些快乐，甚至是其他更多的东西。', 'I hope everyone can find some happiness in this sport—and maybe something more, too.'],
  ['这也就是我想创建这个网站的初衷。', 'That is why I wanted to create this website.'],
  ['现在的我也在学习计算机科学。虽然这个网站主体还是通过 Web Coding 一点点做出来的，但也算是我把自己的专业学习和喜欢的事情结合起来的一次尝试。', 'I’m studying computer science now. The main part of this site was built step by step through web coding. It is one way I’m trying to bring what I study together with something I love.'],
  ['希望这个小小的网站，能给你带来一些乐趣。', 'I hope this little website brings you a bit of joy.'],
  ['也希望你能喜欢飞盘。', 'And I hope you’ll enjoy ultimate, too.'],
];

const CREDITS: CreditGroup[] = [
  {
    heading: ['规则与飞盘精神（Spirit of the Game）', 'Rules & Spirit of the Game'],
    items: [
      { label: ['WFDF《极限飞盘规则 2025–2028》', 'WFDF Rules of Ultimate 2025–2028'], note: ['规则页与犯规页的主要依据；本站用通俗语言整理，具体比赛以官方规则为准。', 'Primary reference for the rules and fouls pages. This site is a plain-language guide; the official rules govern play.'], href: 'https://rules.wfdf.sport/resources/' },
      { label: ['WFDF 官方手势资料', 'WFDF Official Hand Signals'], note: ['用于核对规则手势与相关说明。', 'Used to check official signals and related explanations.'], href: 'https://rules.wfdf.sport/wp-content/uploads/2025/03/WFDF-Rules-of-Ultimate-2025-2028-Hand-Signals.pdf' },
      { label: ['WFDF 飞盘精神与评分学习资源', 'WFDF Spirit of the Game & scoring resources'], note: ['用于飞盘精神页面的延伸阅读；页面中的场上观察提示是本站整理，不是官方评分表原文。', 'Further reading for the Spirit page. The on-field prompts here are our practical summary, not official scoring-sheet text.'], href: 'https://wfdf.sport/organisation/spirit-of-the-game/' },
      { label: ['WFDF Academy 飞盘精神评分资源', 'WFDF Academy Spirit Scoring resources'], note: ['官方课程与评分资料入口。', 'Official course and scoring-resource entry point.'], href: 'https://academy.wfdf.sport/course/section.php?id=291&lang=en' },
    ],
  },
  {
    heading: ['网站与场景来源', 'Site & scene credits'],
    items: [
      { label: ['首页原创草地场景的风格参考 · X', 'Style reference for the original homepage meadow · X'], note: ['参考场景氛围与视觉方向；首页场景由本站重新搭建。', 'A reference for atmosphere and visual direction; the homepage scene was rebuilt for this site.'], href: 'https://x.com/Guronnimo/status/2115807293765832715' },
      { label: ['星谷场景基础项目 · 小红书', 'Base project for the Starvalley scene · Xiaohongshu'], note: ['以原帖中已完成的项目为基础 fork 并修改。原作者署名与授权范围以原项目说明为准。', 'Forked and modified from the project shared in the original post. Please refer to the original creator’s notes for attribution and license terms.'], href: 'https://xhslink.cn/o/20B74XF4Ya4' },
    ],
  },
  {
    heading: ['游戏体验参考', 'Game design references'],
    items: [
      { label: ['Sable + Rollerdrome · 美术方向', 'Sable + Rollerdrome · visual direction'], note: ['参考简洁 3D 模型、鲜明色彩、清晰轮廓，以及我偏好的 MindMarket 式平面 UI；不代表直接使用这些作品素材。', 'References for simple 3D forms, bold colors, clear silhouettes and the flat UI style I like in MindMarket—not a source of assets.'] },
      { label: ['The Pathless · 运动体验', 'The Pathless · movement feel'], note: ['参考移动、转向、视野与连续动作，让操控更像在场地里活动，而不只是转动镜头。', 'A reference for movement, turning, view and continuous action, so control feels like moving on a field rather than steering a camera.'] },
      { label: ['Windjammers 2 · 比赛反馈', 'Windjammers 2 · match feedback'], note: ['参考飞盘飞行、拦截、得分与攻防节奏；它不是 3D 游戏，但在玩法表达上与主题接近。', 'A reference for disc flight, interceptions, scoring and attack–defense rhythm. It is not 3D, but its play expression is close to the theme.'] },
    ],
  },
  {
    heading: ['首页行走音效', 'Homepage walking sounds'],
    items: [
      { label: ['草地脚步 · Women walking on grass outside with sneakers', 'Grass footsteps · Women walking on grass outside with sneakers'], note: ['Freesound：AnikadeBeer_231312 · CC0。保留作者名与来源链接以示感谢。', 'Freesound: AnikadeBeer_231312 · CC0. Credited here with thanks.'], href: 'https://freesound.org/people/AnikadeBeer_231312/sounds/707915/' },
      { label: ['雪地脚步 · Footsteps in Deep Snow', 'Snow footsteps · Footsteps in Deep Snow'], note: ['Freesound：Kinoton · CC0。', 'Freesound: Kinoton · CC0.'], href: 'https://freesound.org/people/Kinoton/sounds/419708/' },
      { label: ['落叶脚步 · Footsteps Leaves.wav', 'Dry-leaf footsteps · Footsteps Leaves.wav'], note: ['Freesound：spenceomatic · CC0。', 'Freesound: spenceomatic · CC0.'], href: 'https://freesound.org/people/spenceomatic/sounds/119765/' },
    ],
  },
];

export default function About() {
  const { lang } = useI18n();
  const zh = lang === 'zh';

  return (
    <PageShell slug="/about">
      <Section
        id="about-intro"
        label={zh ? '关于我与这个网站' : 'About me & this site'}
        heading={zh ? '把喜欢的飞盘，做成一个小小的网页。' : 'A small website made from a love of ultimate.'}
        intro={zh ? '嗨，我是 Maria。这里有我对极限飞盘（ultimate）的解释、互动体验，也有我和朋友们的故事。' : 'Hi, I’m Maria. This site brings together plain-language explanations, playful experiences, and stories from me and my friends.'}
      >
        <div className="ap-about-intro">
          <span className="ap-about-stamp" aria-hidden="true"><svg viewBox="0 0 64 44"><ellipse cx="32" cy="22" rx="28" ry="16"/><ellipse cx="32" cy="22" rx="18" ry="9"/><path d="M22 22q10-6 20 0"/></svg></span>
          <p>{zh ? '网站主体通过 Web Coding 一点点搭建，是我把正在学习的计算机科学和喜欢的运动放在一起的一次尝试。' : 'The site was built step by step through web coding—an attempt to bring what I’m studying in computer science together with a sport I love.'}</p>
          <p>{zh ? '这是个人项目，不代表 WFDF 或所列游戏作品的官方立场。规则内容是面向初学者的通俗整理，示意图和游戏也做了简化；需要作正式判断时，请以 WFDF 当前规则和具体赛事规定为准。' : 'This is a personal project, not an official WFDF or game-studio site. The rules are simplified for new players, and the diagrams and game also simplify real play. For official decisions, use the current WFDF rules and event-specific regulations.'}</p>
        </div>
      </Section>

      <Section
        id="letter"
        label={zh ? '写给飞盘的一封信' : 'A letter to ultimate'}
        heading={zh ? '至少现在，我想按自己的方式去喜欢。' : 'For now, I want to love it in my own way.'}
        intro={zh ? '这封信写给飞盘，也写给那些曾经怀疑过自己是不是不够好的时刻。' : 'This letter is for ultimate—and for the moments when I wondered if I was good enough.'}
        full
      >
        <article className="ap-about-letter" lang={zh ? 'zh-CN' : 'en'}>
          <div className="ap-about-letter-top">
            <span>{zh ? '私人信笺 · 给飞盘' : 'A personal note · to ultimate'}</span>
            <span>{zh ? '第六年' : 'Year six'}</span>
          </div>
          <div className="ap-about-letter-body">
            {LETTER.map((paragraph, index) => <p key={index}>{pick(lang, paragraph)}</p>)}
          </div>
          <div className="ap-about-signoff">
            <strong>Maria</strong>
            <b>See you on the field! 🥏</b>
          </div>
        </article>
      </Section>

      <Section
        id="credits"
        label={zh ? '制作说明与参考资料' : 'Build notes & references'}
        heading={zh ? '每一份灵感，都标出它的来处。' : 'Every reference deserves a clear credit.'}
        intro={zh ? '下面列出规则依据、场景来源、游戏设计灵感和行走音效。' : 'Here are the rules, scene sources, game-design references and walking sounds behind the site.'}
        full
      >
        <div className="ap-about-credit-grid">
          {CREDITS.map((group, groupIndex) => (
            <section className="ap-about-credit-group" key={groupIndex}>
              <h3>{pick(lang, group.heading)}</h3>
              <ul>
                {group.items.map((credit, itemIndex) => (
                  <li key={itemIndex}>
                    {credit.href
                      ? <a href={credit.href} target="_blank" rel="noopener noreferrer">{pick(lang, credit.label)} <span aria-hidden="true">↗</span></a>
                      : <strong>{pick(lang, credit.label)}</strong>}
                    <p>{pick(lang, credit.note)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Section>

      <Section
        id="contact"
        label={zh ? '来信给我' : 'Say hello'}
        heading={zh ? '发现错误，或想分享你为什么喜欢飞盘？' : 'Spotted an error, or want to share why you love ultimate?'}
        intro={zh ? '欢迎写信。你的一句话，也可能成为这个网站里新的故事。' : 'I’d love to hear from you. A few words from you might become a new story on this site.'}
      >
        <a className="ap-about-mail" href={`mailto:${CONTACT_EMAIL}`}>
          <span>{zh ? '联系 Maria' : 'Email Maria'}</span>
          <strong>{CONTACT_EMAIL}</strong>
          <span aria-hidden="true">↗</span>
        </a>
        <p className="ap-about-mail-note">{zh ? '内容有误、想补充资料，或愿意分享自己的飞盘理由，都可以联系我。' : 'Send a correction, suggest a source, or share your own reason for loving the sport.'}</p>
      </Section>
    </PageShell>
  );
}
