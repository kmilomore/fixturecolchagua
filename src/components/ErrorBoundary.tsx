import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg p-6">
          <Card>
            <CardHeader>
              <CardTitle>Algo salió mal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted">{this.state.error.message}</p>
              <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                Recargar página
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
