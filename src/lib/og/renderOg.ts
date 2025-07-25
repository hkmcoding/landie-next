import { ImageResponse } from 'next/og'

export interface OgData {
  name: string
  avatarUrl: string | null
  tagline: string | null
}

export const OG_SIZE = {
  width: 1200,
  height: 630,
}

export async function renderOg({ name, avatarUrl, tagline }: OgData): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, hsl(222, 84%, 4.9%) 0%, hsl(222, 84%, 7%) 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Avatar Circle */}
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: '50%',
            border: '8px solid white',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
            background: '#fff',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '80%',
                height: '80%',
                background: 'hsl(222, 84%, 4.9%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 120,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#fff',
            textAlign: 'center',
            marginBottom: 20,
            maxWidth: '90%',
          }}
        >
          {name}
        </div>

        {/* Tagline */}
        {tagline && (
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              maxWidth: '80%',
              lineHeight: 1.2,
            }}
          >
            {tagline}
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE }
  )
}

export function renderFallbackOg(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'hsl(222, 84%, 4.9%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 20,
          }}
        >
          Landie
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          Create your personal coaching page
        </div>
      </div>
    ),
    { ...OG_SIZE }
  )
} 