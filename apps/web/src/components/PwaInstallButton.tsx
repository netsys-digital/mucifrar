import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaInstallButton({ className = 'btn btn-primary' }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIosHint(isIos);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function onInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  if (installed) {
    return (
      <p className="ok-text" role="status">
        Importador instalado neste dispositivo.
      </p>
    );
  }

  if (deferred) {
    return (
      <button type="button" className={className} onClick={() => void onInstall()}>
        Baixar Importador de cifra
      </button>
    );
  }

  if (iosHint) {
    return (
      <div className="pwa-ios-hint">
        <p className="muted">
          No iPhone/iPad: toque em <strong>Compartilhar</strong> e depois{' '}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
      </div>
    );
  }

  return (
    <p className="muted">
      Se o botão de instalação não aparecer, use o menu do navegador →{' '}
      <strong>Instalar app</strong> / <strong>Adicionar à tela inicial</strong> nesta página.
    </p>
  );
}
