import type { Metadata } from 'next';
import Fouls from './Fouls';

export const metadata: Metadata = {
  title: '犯规 · Fouls — Ultimate Field',
  description: '常见犯规、违规与违例，以及自我裁决中如何解决争议 · Common fouls and violations, and how disputes are resolved under self-officiating.',
};

export default function Page() {
  return <Fouls />;
}
