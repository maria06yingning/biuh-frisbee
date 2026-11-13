'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { useI18n } from '@/i18n/I18nProvider';
import { CONTACT_EMAIL, pick, type Bi, withBase } from '@/content/shared';
import PageShell, { Section } from '@/components/PageShell';
import '@/styles/aero-about.css';

type Credit = { label: Bi; note: Bi; href?: string };
type CreditGroup = { heading: Bi; items: Credit[] };

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
  const [letterOpen, setLetterOpen] = useState(false);
  const letterPanelId = `about-letter-${useId().replace(/:/g, '')}`;

  return (
    <PageShell slug="/about">
      <Section
        id="about-intro"
        label={zh ? '关于我与这个网站' : 'About me & this site'}
        heading={zh ? '把喜欢的飞盘，做成一个小小的网页。' : 'A small website made from a love of ultimate.'}
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
        <div className="ap-about-letter-experience">
          <button
            className={`ap-about-envelope${letterOpen ? ' is-open' : ''}`}
            type="button"
            aria-expanded={letterOpen}
            aria-controls={letterPanelId}
            onClick={() => setLetterOpen(value => !value)}
          >
            <svg className="ap-about-envelope-art" viewBox="0 0 560 230" aria-hidden="true">
              <rect x="8" y="12" width="544" height="206" fill="var(--uf-cyan)" stroke="var(--uf-ink)" strokeWidth="6" />
              <rect x="54" y="35" width="452" height="158" fill="var(--uf-paper)" stroke="var(--uf-ink)" strokeWidth="4" />
              <path d="M12 18 280 168 12 214Z" fill="var(--uf-cyan)" stroke="var(--uf-ink)" strokeWidth="5" />
              <path d="M548 18 280 168 548 214Z" fill="var(--uf-cyan)" stroke="var(--uf-ink)" strokeWidth="5" />
              <path d="M12 214 280 92 548 214Z" fill="var(--uf-cyan)" stroke="var(--uf-ink)" strokeWidth="5" />
              <path className="ap-about-envelope-flap" d="M12 16 280 160 548 16Z" fill="var(--uf-yellow)" stroke="var(--uf-ink)" strokeWidth="6" />
            </svg>
            <span className="ap-about-envelope-copy">
              <strong>{letterOpen ? (zh ? '信已展开 · 点此合上' : 'Letter open · close it') : (zh ? '点开这封信' : 'Open this letter')}</strong>
              
            </span>
            <span className="ap-about-envelope-seal" aria-hidden="true">
              <svg viewBox="0 0 64 44"><ellipse cx="32" cy="22" rx="28" ry="16"/><ellipse cx="32" cy="22" rx="18" ry="9"/><path d="M22 22q10-6 20 0"/></svg>
            </span>
          </button>

          <div id={letterPanelId} hidden={!letterOpen}>
            {letterOpen && (
              <div className="ap-about-letter-reveal">
                <Image
                  className="ap-about-letter-image"
                  src={withBase(zh ? '/maria-letter-zh.png' : '/maria-letter-en.png')}
                  alt={zh ? 'Maria 写给飞盘的中文手写信' : 'Maria’s handwritten English letter to ultimate'}
                  width={4961}
                  height={7016}
                  unoptimized
                />
              </div>
            )}
          </div>
        </div>
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
