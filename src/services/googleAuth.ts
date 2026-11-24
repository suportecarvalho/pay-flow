import type { AuthUser } from '../types/user';

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }) => {
    requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
  };
  revoke: (token: string, done?: () => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2;
      };
    };
  }
}

export function isGoogleAuthConfigured(): boolean {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  return Boolean(clientId && clientId.trim().length > 0);
}

export function signInWithGoogle(): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const clientId = (
      import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    )?.trim();

    if (!clientId) {
      reject(
        new Error(
          'VITE_GOOGLE_CLIENT_ID não configurado. Crie um arquivo .env na raiz do projeto com seu Client ID do Google.'
        )
      );
      return;
    }

    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(
        new Error(
          'Serviço do Google ainda está carregando ou bloqueado. Recarregue a página e tente novamente.'
        )
      );
      return;
    }

    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid profile email',
      callback: async (tokenResponse) => {
        if (tokenResponse.error || !tokenResponse.access_token) {
          reject(
            new Error(
              tokenResponse.error_description ||
                'Não foi possível concluir o login com o Google.'
            )
          );
          return;
        }

        try {
          const res = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            }
          );

          if (!res.ok) {
            throw new Error('Falha ao buscar dados da conta Google.');
          }

          const profile = (await res.json()) as {
            sub: string;
            name?: string;
            given_name?: string;
            email?: string;
            picture?: string;
          };

          const fullName = profile.name || profile.email || 'Usuário';
          const givenName =
            profile.given_name || fullName.split(' ')[0] || 'Usuário';

          resolve({
            id: profile.sub,
            name: fullName,
            givenName,
            email: profile.email || '',
            picture: profile.picture,
          });
        } catch (err) {
          reject(
            err instanceof Error
              ? err
              : new Error('Erro ao carregar perfil do Google.')
          );
        }
      },
      error_callback: (err) => {
        if (err.type === 'popup_closed') {
          reject(new Error('Login cancelado.'));
          return;
        }
        reject(new Error('Erro ao abrir o login do Google.'));
      },
    });

    client.requestAccessToken({ prompt: 'select_account' });
  });
}
