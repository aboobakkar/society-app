import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Check if user already dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      setIsDismissed(true)
    }

    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    setIsIOS(ios)

    // Listen for Chrome/Android install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setPromptEvent(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!promptEvent) return false
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setPromptEvent(null)
      return true
    }
    return false
  }

  const dismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true')
    setIsDismissed(true)
  }

  // Show banner if:
  // - Not already installed
  // - Not dismissed
  // - Either has a prompt event (Android/Chrome) OR is iOS
  const showBanner =
    !isInstalled &&
    !isDismissed &&
    (!!promptEvent || isIOS)

  return { install, dismiss, showBanner, isIOS, isInstalled }
}
