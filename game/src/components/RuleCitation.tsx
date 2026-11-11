import type { ReactNode } from 'react';

type Language = 'zh' | 'en';

function citationText(reference: string | undefined, lang: Language): ReactNode {
  const safeReference = reference?.trim() || (lang === 'zh' ? '待核对' : 'to verify');
  if (lang === 'zh') {
    return <>WFDF《极限飞盘规则 2025–2028》· 条款 {safeReference.replace(/Introduction/g, '引言')}</>;
  }
  const englishReference = safeReference.replace(/、/g, ', ');
  if (englishReference.startsWith('Introduction')) {
    return <>WFDF Rules of Ultimate 2025–2028 · {englishReference}</>;
  }
  const plural = englishReference.includes(',') || englishReference.includes('–') ? 'Rules' : 'Rule';
  return <>WFDF Rules of Ultimate 2025–2028 · {plural} {englishReference}</>;
}

export default function RuleCitation({ reference, lang }: { reference?: string; lang: Language }) {
  return (
    <aside className="ap-rule-citation" aria-label={lang === 'zh' ? '规则出处' : 'Rule source'}>
      <span className="ap-rule-citation-label">{lang === 'zh' ? '规则依据' : 'RULE BASIS'}</span>
      <a href="https://rules.wfdf.sport/resources/" target="_blank" rel="noopener noreferrer">
        <span className="ap-rule-citation-reference">{citationText(reference, lang)}</span>
        <span className="ap-rule-citation-action">
          {lang === 'zh' ? '查看 WFDF 官方规则' : 'View official WFDF rules'} <span aria-hidden="true">↗</span>
        </span>
      </a>
    </aside>
  );
}
