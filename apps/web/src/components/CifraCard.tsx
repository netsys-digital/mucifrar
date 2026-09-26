import { Link } from 'react-router-dom';
import type { Cifra } from '../lib/api';

function coverTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hues = [210, 32, 160, 45, 250, 185];
  const hue = hues[hash % hues.length];
  return `linear-gradient(145deg, hsl(${hue} 28% 28%), hsl(${hue} 35% 16%))`;
}

export function CifraCard({ cifra }: { cifra: Cifra }) {
  return (
    <Link to={`/cifra/${cifra.slug}`} className="cifra-card">
      <div className="cifra-card-cover" style={{ background: coverTone(`${cifra.title}-${cifra.artist}`) }}>
        <span className="cifra-card-cover-title">{cifra.title}</span>
        <span className="cifra-card-cover-key">Tom {cifra.key}</span>
      </div>
      <div className="cifra-card-body">
        <h3 className="cifra-card-title">{cifra.title}</h3>
        <p className="cifra-card-artist">{cifra.artist}</p>
        <div className="cifra-card-meta">
          <span className="cifra-card-views">{cifra.views} views</span>
          {cifra.authorName ? <span>{cifra.authorName}</span> : null}
        </div>
      </div>
    </Link>
  );
}
