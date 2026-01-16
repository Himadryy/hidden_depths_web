import Scene from '@/components/Scene';
import Overlay from '@/components/Overlay';

export default function Home() {
  return (
    <div className="relative w-full h-full overflow-x-hidden">
      <Scene />
      <Overlay />
    </div>
  );
}