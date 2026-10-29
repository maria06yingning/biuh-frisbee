'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import CodexPanel from '@/components/CodexPanel';
import AeroHome from '@/components/AeroHome';
import TacticsLab from '@/components/TacticsLab';
import { loadUnlocked } from '@/components/FieldExperience';

// three.js 只在浏览器里加载，叙事首页的体积与首屏都不受影响
const FieldExperience = dynamic(() => import('@/components/FieldExperience'), {
  ssr: false,
  loading: () => (
    <div className="exp-root">
      <div className="exp-card">…</div>
    </div>
  ),
});

export default function Home() {
  const [playing, setPlaying] = useState(false);
  const [codex, setCodex] = useState<string[] | null>(null);
  const [lab, setLab] = useState(false);

  // 从战术实验室返回时回到战术段落，而不是被弹回页面顶部
  const exitLab = useCallback(() => {
    setLab(false);
    window.requestAnimationFrame(() => {
      document.getElementById('aero-intro')?.scrollIntoView({ block: 'start' });
    });
  }, []);

  if (lab) return <TacticsLab onExit={exitLab} />;
  if (playing) return <FieldExperience onExit={() => setPlaying(false)} />;

  return (
    <>
      <AeroHome onPlay={() => { window.scrollTo(0, 0); setPlaying(true); }} onLab={() => { window.scrollTo(0, 0); setLab(true); }} onCodex={() => setCodex(loadUnlocked())} />
      {codex && <CodexPanel unlocked={codex} onClose={() => setCodex(null)} />}
    </>
  );
}
