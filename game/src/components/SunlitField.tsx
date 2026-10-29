'use client';

import meadow from '../../public/photos/sunlit-meadow.webp';

export const MEADOW_IMAGE_SRC = meadow.src;

/** The same photograph remains visible if WebGL is unavailable or motion is reduced. */
export default function SunlitField() {
  return <div className="aero-field" aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={MEADOW_IMAGE_SRC} width={meadow.width} height={meadow.height} alt="" fetchPriority="high" decoding="async" />
  </div>;
}
