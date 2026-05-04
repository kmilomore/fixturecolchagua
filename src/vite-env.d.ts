/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAS_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface GoogleCredentialResponse {
  credential?: string
}

interface GoogleRenderButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  width?: number
}

interface Window {
  google?: {
    accounts?: {
      id: {
        initialize: (options: {
          client_id: string
          callback: (response: GoogleCredentialResponse) => void
          auto_select?: boolean
        }) => void
        renderButton: (parent: HTMLElement, options: GoogleRenderButtonOptions) => void
        disableAutoSelect: () => void
      }
    }
  }
}
