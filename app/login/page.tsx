'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Logo } from '@/components/ui/Logo'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Onjuiste inloggegevens')
      setLoading(false)
      return
    }

    const from = searchParams.get('from') ?? '/'
    router.push(from)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-marble">
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Logo variant="full-dark" size={120} className="mb-4 rounded-2xl" priority />
          <p
            className="font-body text-[11px] uppercase tracking-[0.15em] font-medium"
            style={{ color: '#F5AF40' }}
          >
            Premium aankoopmakelaar Spanje
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="font-heading text-lg font-bold text-deepsea mb-6 text-center">
            Inloggen
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block font-body text-sm font-medium text-deepsea mb-1.5">
                E-mailadres
              </label>
              <input
                autoFocus
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="naam@costaselect.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-deepsea focus:ring-1 focus:ring-deepsea/20 transition-colors"
              />
            </div>
            <div className="mb-5">
              <label className="block font-body text-sm font-medium text-deepsea mb-1.5">
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Voer wachtwoord in"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-deepsea focus:ring-1 focus:ring-deepsea/20 transition-colors"
              />
            </div>
            {error && <p className="font-body text-sm text-red-500 mb-4">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-deepsea text-marble font-body font-semibold py-3 rounded-xl text-sm disabled:opacity-50 hover:bg-deepsea-light transition-colors cursor-pointer"
            >
              {loading ? 'Inloggen...' : 'Inloggen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
