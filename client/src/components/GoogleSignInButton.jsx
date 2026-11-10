import { useEffect, useRef, useState } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
let googleScriptPromise

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gsi-script')
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

export default function GoogleSignInButton({ onCredential, onUnavailable, text = 'signin_with' }) {
  const buttonRef = useRef(null)
  const callbackRef = useRef(onCredential)
  const [status, setStatus] = useState(GOOGLE_CLIENT_ID ? 'loading' : 'missing')

  useEffect(() => {
    callbackRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined
    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => callbackRef.current?.(response),
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
        })
        buttonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          width: 400,
          logo_alignment: 'left',
        })
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      if (buttonRef.current) buttonRef.current.innerHTML = ''
    }
  }, [text])

  if (status === 'missing' || status === 'error') {
    return (
      <button
        type="button"
        onClick={() => onUnavailable?.(status)}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-semibold text-[#3c4043] shadow-sm transition hover:bg-[#f7f8f8] focus:outline-none focus:ring-2 focus:ring-[#4285f4]/30"
        aria-label="Sign in with Google"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {status === 'missing' ? 'Sign in with Google' : 'Retry with Google'}
      </button>
    )
  }

  return <div ref={buttonRef} className="flex min-h-12 w-full items-center justify-center" aria-label="Sign in with Google" />
}
