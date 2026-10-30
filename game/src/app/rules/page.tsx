import type { Metadata } from 'next';
import Rules from './Rules';

export const metadata: Metadata = {
  title: '规则 · Rules — Ultimate Field',
  description: '极限飞盘的基本规则与玩法，依据 WFDF 规则 2025–2028 · The basic rules of ultimate, following the WFDF Rules of Ultimate 2025–2028.',
};

export default function Page() {
  return <Rules />;
}
