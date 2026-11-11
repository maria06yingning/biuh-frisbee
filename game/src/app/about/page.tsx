import type { Metadata } from 'next';
import About from './About';

export const metadata: Metadata = {
  title: '关于 Maria · About — Ultimate Field',
  description: '关于这个飞盘科普网站、它的制作来源，以及一封写给飞盘的信。',
};

export default function Page() {
  return <About />;
}
