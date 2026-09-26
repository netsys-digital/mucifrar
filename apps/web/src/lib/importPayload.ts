export const PENDING_IMPORT_KEY = 'mucifrar_pending_import';

export type ImportedCifraPayload = {
  title: string;
  artist: string;
  key: string;
  content: string;
};

export function encodeImportPayload(data: ImportedCifraPayload): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function decodeImportPayload(raw: string): ImportedCifraPayload | null {
  try {
    const json = decodeURIComponent(escape(atob(raw.trim())));
    const data = JSON.parse(json) as Partial<ImportedCifraPayload>;
    if (!data.content || typeof data.content !== 'string') return null;
    return {
      title: String(data.title || 'Cifra importada').slice(0, 200),
      artist: String(data.artist || 'Desconhecido').slice(0, 200),
      key: String(data.key || 'C').slice(0, 12),
      content: data.content.slice(0, 50_000),
    };
  } catch {
    return null;
  }
}

export function savePendingImport(data: ImportedCifraPayload) {
  sessionStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify(data));
}

export function peekPendingImport(): ImportedCifraPayload | null {
  try {
    const raw = sessionStorage.getItem(PENDING_IMPORT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<ImportedCifraPayload>;
    if (!data.content || typeof data.content !== 'string') return null;
    return {
      title: String(data.title || 'Cifra importada').slice(0, 200),
      artist: String(data.artist || 'Desconhecido').slice(0, 200),
      key: String(data.key || 'C').slice(0, 12),
      content: data.content.slice(0, 50_000),
    };
  } catch {
    return null;
  }
}

export function clearPendingImport() {
  sessionStorage.removeItem(PENDING_IMPORT_KEY);
}

export function consumePendingImport(): ImportedCifraPayload | null {
  const data = peekPendingImport();
  return data;
}

export function takePendingImport(): ImportedCifraPayload | null {
  return peekPendingImport();
}

/** Gera o href javascript: do bookmarklet apontando para o origin atual. */
export function buildBookmarkletHref(appOrigin: string): string {
  const origin = appOrigin.replace(/\/$/, '');
  const src = `
(function(){
  var APP=${JSON.stringify(origin)};
  function clean(s){return String(s||'').replace(/\\u00a0/g,' ').replace(/[ \\t]+$/gm,'').replace(/\\n{3,}/g,'\\n\\n').trim()}
  var pres=[].slice.call(document.querySelectorAll('pre'));
  var pre=document.querySelector('pre.js-tab-content,pre.cifra,pre[class*="cifra"]')||pres.sort(function(a,b){return (b.textContent||'').length-(a.textContent||'').length})[0];
  if(!pre||clean(pre.innerText).length<20){alert('Não achei a cifra nesta página. Abra uma cifra no Cifra Club (página da música ou imprimir).');return}
  var title='',artist='';
  var pageTitle=(document.title||'').replace(/\\s+/g,' ').trim();
  var parts=pageTitle.split(' - ').map(function(p){return p.trim()}).filter(Boolean).filter(function(p){return !/^cifra club$/i.test(p)});
  if(parts.length>=2){title=parts[0];artist=parts.slice(1).join(' - ')}
  else if(parts.length===1){title=parts[0]}
  var h1=document.querySelector('h1');
  if(h1&&(!title||title.length<2)) title=clean(h1.textContent);
  var key='C';
  var m=(document.body.innerText||'').match(/\\bTom\\s*[:：]\\s*([A-G](?:#|b)?(?:m|maj|min)?(?:\\/[A-G](?:#|b)?)?)/i);
  if(m) key=m[1];
  var path=location.pathname.split('/').filter(Boolean);
  if(!artist&&path[0]) artist=path[0].replace(/-/g,' ');
  if(!title&&path[1]) title=path[1].replace(/-/g,' ');
  var data={title:title||'Cifra importada',artist:artist||'Desconhecido',key:key,content:clean(pre.innerText)};
  var enc=btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  location.href=APP+'/importar-dados#import='+enc;
})();`.replace(/\n/g, '');

  return `javascript:${src}`;
}
