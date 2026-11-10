import { MapPin, Shield, ShieldCheck, Clock } from 'lucide-react'

export default function AuthLayout({ children, mode = 'login' }) {
  const isLogin = mode === 'login'

  const features = [
    { icon: MapPin, title: 'Verified Listings' },
    { icon: Clock, title: 'Track Payments' },
    { icon: Shield, title: 'Blockchain Secured' }
  ]

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-8 overflow-y-auto bg-cover bg-center bg-no-repeat p-4 sm:p-6 lg:flex-row lg:items-start lg:gap-10 lg:p-10"
      style={{
        backgroundColor: '#064e3b',
        backgroundImage: "linear-gradient(120deg, rgba(2, 44, 34, 0.72), rgba(6, 95, 70, 0.48)), url('/terrava-auth-bg.jpg')",
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-emerald-950/55" />

      {/* Left branding card */}
      <div className={`relative flex w-full flex-col rounded-3xl border border-white/10 bg-emerald-950/35 p-6 shadow-2xl backdrop-blur-sm lg:w-[42%] lg:p-10 ${isLogin ? 'lg:self-center' : 'lg:self-start'}`}>

        <div className="relative flex flex-col flex-1">
          {/* Secured badge */}
          <div className="absolute top-0 right-0 hidden md:block">
            <div className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white bg-emerald-800/60 border border-emerald-400/30 backdrop-blur-md shadow-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              Secured
            </div>
          </div>

          {/* Logo + brand */}
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/terrava-logo.png"
              alt="Terrava"
              className="w-12 h-12 rounded-xl p-1.5 object-contain bg-white/95 shadow-lg"
            />
            <div>
              <span className="text-3xl font-extrabold leading-none text-white drop-shadow-md">Terrava</span>
              <p className="text-white/90 text-sm mt-1 font-medium">Land Selling System</p>
            </div>
          </div>

          {/* Portal badge */}
          <div className="inline-flex items-center justify-center gap-2 rounded-full w-fit px-4 py-2 text-sm font-semibold mb-6 text-white bg-emerald-800/50 border border-emerald-400/30 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Land Selling Portal</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 text-white drop-shadow-lg">
            {isLogin ? <>Welcome<br />Back</> : <>Join<br />Terrava</>}
          </h2>

          <p className="text-white/95 text-base md:text-lg leading-relaxed mb-36 font-medium drop-shadow-md">
            {isLogin
              ? 'Sign in to access your land listings, track payments, and manage your properties.'
              : 'Create an account to start buying or selling land with confidence, transparency, and blockchain-backed payments.'}
          </p>

          <div className="flex-1" />

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-4 bg-white/10 border border-white/15 backdrop-blur-sm hover:bg-white/15 transition shadow-lg"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-emerald-300" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-white">{f.title}</h3>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/80 text-sm mt-8 font-medium">© 2025 Terrava. All rights reserved.</p>
      </div>
      {/* Right form card */}
      <div className={`relative w-full rounded-3xl border border-white/60 bg-white/90 p-6 shadow-2xl backdrop-blur-md sm:p-8 lg:w-[40%] lg:p-9 ${isLogin ? 'lg:self-center' : 'lg:self-start lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto'}`}>
        {children}
      </div>
    </div>
  )
}
