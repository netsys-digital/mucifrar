import { Link } from 'react-router-dom';
import type { Playlist } from '../lib/api';

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link to={`/playlist/${playlist.slug}`} className="playlist-card">
      <div className="playlist-card-top">
        <span className={`playlist-vis ${playlist.visibility === 'PUBLIC' ? 'is-public' : 'is-private'}`}>
          {playlist.visibility === 'PUBLIC' ? 'Pública' : 'Privada'}
        </span>
        <span className="muted">{playlist.itemCount} cifra{playlist.itemCount === 1 ? '' : 's'}</span>
      </div>
      <h3 className="playlist-card-title">{playlist.title}</h3>
      {playlist.description ? <p className="playlist-card-desc">{playlist.description}</p> : null}
      <div className="playlist-card-meta">
        {playlist.ownerName ? <span>{playlist.ownerName}</span> : null}
      </div>
    </Link>
  );
}
