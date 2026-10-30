import type { Metadata } from 'next';
import Why from './Why';

export const metadata: Metadata = {
  title: '为何热爱 · Why we love it — Ultimate Field',
  description: '社区、自由、团队合作与社交：我们为什么爱飞盘 · Community, freedom, teamwork and friendship: why we love ultimate.',
};

export default function Page() {
  return <Why />;
}
