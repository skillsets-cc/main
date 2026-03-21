import type { ReactElement } from 'react';

export default function SurfaceLayers(): ReactElement {
  return (
    <>
      <div className="surface-speckle" />
      <div className="surface-gloss" />
      <div className="absolute inset-0 rounded-sm pointer-events-none mix-blend-screen"
           style={{ padding: '1px', background: 'radial-gradient(400px circle at var(--cursor-x, 50%) var(--cursor-y, 50%), rgba(249,115,22, 0.4), transparent) fixed', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' as const }} />
    </>
  );
}
