import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  decodeImportPayload,
  savePendingImport,
} from '../lib/importPayload';

/** Landing pública do bookmarklet: grava payload e manda para /enviar. */
export function ImportPayloadPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const raw = hash.startsWith('#import=') ? hash.slice('#import='.length) : '';
    const data = raw ? decodeImportPayload(raw) : null;
    if (data) {
      savePendingImport(data);
    }
    navigate('/enviar', { replace: true });
  }, [navigate]);

  return <p className="page muted">Preparando cifra importada…</p>;
}
