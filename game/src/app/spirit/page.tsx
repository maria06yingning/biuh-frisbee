import type { Metadata } from 'next';
import Spirit from './Spirit';

export const metadata: Metadata = {
  title: '飞盘精神 · Spirit — Ultimate Field',
  description: '飞盘精神（Spirit of the Game）是什么，为什么重要，以及如何评分 · What the Spirit of the Game is, why it matters, and how it is scored.',
};

export default function Page() {
  return <Spirit />;
}
