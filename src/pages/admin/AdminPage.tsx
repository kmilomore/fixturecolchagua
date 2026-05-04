import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { useAdminSession } from '@/stores/adminSession'
import { googleClientId, hasGoogleClientId } from '@/config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function loadGoogleIdentityScript() {
  const existing = document.getElementById('google-identity-services') as HTMLScriptElement | null

  if (existing) {
    if (window.google?.accounts?.id) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Sign-In')), {
        once: true,
      })
    })
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = 'google-identity-services'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Google Sign-In'))
    document.head.appendChild(script)
  })
}

export function AdminPage() {
  const { ok, clearSession, setSession, user } = useAdminSession()
  const buttonRef = useRef<HTMLDivElement | null>(null)

  const login = useMutation({
    mutationFn: async (idToken: string) => {
      if (!idToken) throw new Error('No se pudo obtener la credencial de Google')
      return api.auth.login(idToken)
    },
    onSuccess: (result, idToken) => {
      setSession(idToken, result.user)
    },
  })

  useEffect(() => {
    if (ok || !hasGoogleClientId || !buttonRef.current) return

    let cancelled = false

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return

        buttonRef.current.innerHTML = ''
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response.credential) {
              login.mutate(response.credential)
            }
          },
          auto_select: false,
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 320,
        })
      })
      .catch(() => {
        if (!cancelled) {
          login.reset()
        }
      })

    return () => {
      cancelled = true
    }
  }, [login, ok])

  if (ok) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">Administración</h1>
          <p className="text-sm text-muted">Sesión activa validada con Google Sign-In y backend.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
            <CardDescription>Gestión operativa del fixture.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-black/10 bg-black/5 px-3 py-3 text-sm text-muted">
              {user?.picture ? (
                <img src={user.picture} alt={user.name || user.email} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                  {(user?.name || user?.email || 'A').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-primary">{user?.name || 'Administrador'}</p>
                <p>{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/admin/resultados">Ingresar resultados</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/campeonatos/nuevo">Crear campeonato</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/campeonatos">Ver campeonatos</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                window.google?.accounts?.id.disableAutoSelect()
                clearSession()
              }}
            >
              Cerrar sesión
            </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary">Admin</h1>
        <p className="text-sm text-muted">Acceso exclusivo con Google. Solo entran correos autorizados por backend.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Autenticación admin</CardTitle>
          <CardDescription>La sesión usa Google Sign-In y el backend valida cliente, expiración y correo permitido.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasGoogleClientId ? (
            <p className="text-sm text-accent">Falta configurar VITE_GOOGLE_CLIENT_ID en el frontend.</p>
          ) : null}
          <div ref={buttonRef} className="flex min-h-11 items-center justify-center" />
          {login.isError ? <p className="text-sm text-accent">{(login.error as Error).message}</p> : null}
          {login.isPending ? <p className="text-sm text-muted">Validando credencial de Google…</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
