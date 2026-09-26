import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../.env'), override: true });

if (process.env.DATABASE_URL?.includes('@localhost')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@localhost', '@127.0.0.1');
}

console.log('[seed] iniciando…');

const prisma = new PrismaClient();

const SAMPLE_CONTENT = `Intro: C  G  Am  F

[Verso]
C                G
  Que a paz do Senhor
Am               F
  Habite em nosso lar
C              G
  E o amor de Cristo
Am        F       C
  Venha nos guiar

[Refrão]
F          G
  Aleluia, aleluia
C      Am
  Glória a Deus
F          G         C
  Aleluia, aleluia Senhor`;

async function ensureUser(
  email: string,
  name: string,
  role: 'ADMIN' | 'USER',
  password: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('[seed] usuário já existe:', email);
    return existing;
  }
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      status: 'ACTIVE',
    },
  });
  console.log('[seed] usuário criado:', email, '/', password);
  return user;
}

async function ensureCifras(authorId: string) {
  const samples = [
    {
      slug: 'paz-do-senhor',
      title: 'Paz do Senhor',
      artist: 'Comunidade Católica',
      key: 'C',
    },
    {
      slug: 'ao-unico',
      title: 'Ao Único',
      artist: 'Corinhos Evangélicos',
      key: 'G',
      content: `Tom: G

[Verso]
G              D
  Ao Único que é digno
Em           C
  De receber a glória
G            D
  E os louvores
Em      C      G
  Ao Único Senhor`,
    },
    {
      slug: 'deus-de-promessas',
      title: 'Deus de Promessas',
      artist: 'Diante do Trono',
      key: 'D',
    },
  ];

  for (const sample of samples) {
    const existing = await prisma.cifra.findUnique({ where: { slug: sample.slug } });
    if (existing) {
      console.log('[seed] cifra já existe:', sample.slug);
      continue;
    }
    await prisma.cifra.create({
      data: {
        ...sample,
        content: sample.content ?? SAMPLE_CONTENT,
        status: 'PUBLISHED',
        authorId,
      },
    });
    console.log('[seed] cifra criada:', sample.slug);
  }
}

async function main() {
  const admin = await ensureUser(
    'admin@mucifrar.local',
    'Administrador Chord Seven',
    'ADMIN',
    'Admin@123',
  );
  await ensureUser('user@mucifrar.local', 'Usuário Demo', 'USER', 'User@123');
  await ensureCifras(admin.id);
  console.log('[seed] concluído');
}

main()
  .catch((err) => {
    console.error('[seed] falhou:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
