import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Download, X, Share } from 'lucide-react'

export function PWAInstallBanner() {
  const { install, dismiss, showBanner, isIOS } = usePWAInstall()

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 max-w-lg mx-auto">
      <div className="bg-indigo-700 text-white rounded-2xl shadow-2xl shadow-indigo-900/40 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* App icon */}
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl font-bold flex-shrink-0">
              م
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Add to Home Screen</p>
              <p className="text-indigo-200 text-xs mt-0.5">
                Install MH Society for quick access — works like a native app
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="text-indigo-300 hover:text-white p-1 flex-shrink-0 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {isIOS ? (
            // iOS: manual instructions (no API available)
            <div className="mt-3 bg-white/10 rounded-xl p-3">
              <p className="text-xs text-indigo-100 leading-relaxed">
                Tap <Share size={12} className="inline mx-1 mb-0.5" />
                <strong>Share</strong> in Safari, then tap{' '}
                <strong>"Add to Home Screen"</strong>
              </p>
            </div>
          ) : (
            // Android/Chrome: one-tap install
            <button
              onClick={install}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-white text-indigo-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-indigo-50 transition-colors active:scale-[0.98]"
            >
              <Download size={16} />
              Install App
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
