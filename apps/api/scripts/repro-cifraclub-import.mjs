/**
 * Reproduz flakiness do import Cifra Club (rodar dentro do WSL):
 *   cd apps/api && npx tsx scripts/repro-cifraclub-import.mjs [url]
 */
import { importFromCifraClub } from '../src/modules/cifras/cifraclub.ts';

const url =
  process.argv[2] ??
  'https://www.cifraclub.com.br/adoradores/pra-teu-louvor/?instrument=keyboard';

for (let i = 1; i <= 5; i++) {
  const start = Date.now();
  try {
    const r = await importFromCifraClub(url);
    console.log(
      JSON.stringify({
        attempt: i,
        status: 'ok',
        ms: Date.now() - start,
        title: r.title,
        contentLen: r.content.length,
      }),
    );
  } catch (err) {
    console.log(
      JSON.stringify({
        attempt: i,
        status: err?.statusCode ?? 'error',
        ms: Date.now() - start,
        message: err?.message ?? String(err),
      }),
    );
  }
}
