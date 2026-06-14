import { useState } from 'react'

export function Login({ onLogin }) {
  const [consentido, setConsentido] = useState(false)

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '2rem 1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Fundo decorativo */}
      <div style={{
        position: 'absolute',
        top: '-30%', left: '-20%',
        width: '500px', height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%', right: '-10%',
        width: '400px', height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card central */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 360,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, color: 'white',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
        }}>
          <i className="ti ti-map" />
        </div>

        <h1 style={{
          fontSize: 26, fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--color-text)',
          marginBottom: 8,
          fontFamily: 'var(--font-sans)',
          textAlign: 'center',
        }}>
          Mapa do Bolso
        </h1>
        <p style={{
          fontSize: 13, color: 'var(--color-text3)',
          marginBottom: '1.5rem',
          lineHeight: 1.6,
          textAlign: 'center',
        }}>
          Seu controle financeiro pessoal,<br />simples e eficiente.
        </p>

        {/* Consentimento LGPD */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          margin: '0 0 20px',
          width: '100%',
          padding: '0 8px',
          boxSizing: 'border-box',
        }}>
          <input
            type="checkbox"
            id="lgpd"
            checked={consentido}
            onChange={e => setConsentido(e.target.checked)}
            style={{
              marginTop: 3,
              accentColor: 'var(--g400)',
              cursor: 'pointer',
              flexShrink: 0,
              width: 16,
              height: 16,
            }}
          />
          <label htmlFor="lgpd" style={{
            fontSize: 12,
            color: 'var(--color-text2)',
            lineHeight: 1.6,
            cursor: 'pointer',
          }}>
            Concordo com a{' '}
            <a
              href="/privacidade.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--g400)', textDecoration: 'underline' }}
              onClick={e => e.stopPropagation()}
            >
              Política de Privacidade
            </a>
            . Meus dados serão usados exclusivamente para o funcionamento do app e não serão compartilhados com terceiros.
          </label>
        </div>

        <button
          onClick={consentido ? onLogin : undefined}
          disabled={!consentido}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '13px 24px',
            cursor: consentido ? 'pointer' : 'not-allowed',
            fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 600,
            color: 'var(--color-text)',
            boxShadow: 'var(--shadow-md)',
            transition: 'var(--transition)',
            marginBottom: '1rem',
            opacity: consentido ? 1 : 0.4,
          }}
          onMouseOver={e => { if (consentido) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' } }}
          onMouseOut={e  => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.2 0 24 0 14.6 0 6.6 5.5 2.7 13.5l7.9 6.1C12.5 13.1 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.1 7-10.2 7-17.1z"/>
            <path fill="#FBBC05" d="M10.6 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.2-3 .6-4.4l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.9-6.3z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.7 2.2-7.6 2.2-6.2 0-11.5-4.2-13.4-9.8l-7.9 6.1C6.6 42.5 14.6 48 24 48z"/>
          </svg>
          Entrar com Google
        </button>

        <p style={{ fontSize: 11, color: 'var(--color-text3)', lineHeight: 1.6, textAlign: 'center' }}>
          Seus dados ficam salvos com segurança<br />no Firebase, vinculados à sua conta Google.
        </p>
      </div>
    </div>
  )
}
