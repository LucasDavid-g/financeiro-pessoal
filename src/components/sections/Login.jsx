export function Login({ onLogin }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '2rem',
    }}>
      <div style={{
        width: 56, height: 56,
        borderRadius: 16,
        background: 'var(--g400)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        color: 'white',
        marginBottom: '1.5rem',
      }}>
        <i className="ti ti-map" />
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-.5px', marginBottom: '.5rem' }}>
        Mapa do Bolso
      </h1>
      <p style={{ fontSize: 13, color: 'var(--color-text3)', marginBottom: '2.5rem', fontFamily: 'var(--font-mono)' }}>
        controle financeiro pessoal
      </p>

      <button
        onClick={onLogin}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--color-surface)',
          border: '0.5px solid var(--color-border2)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 24px',
          cursor: 'pointer',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text)',
          fontWeight: 500,
          boxShadow: 'var(--shadow-sm)',
          transition: 'var(--transition)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.2 0 24 0 14.6 0 6.6 5.5 2.7 13.5l7.9 6.1C12.5 13.1 17.8 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.1 7-10.2 7-17.1z"/>
          <path fill="#FBBC05" d="M10.6 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.2-3 .6-4.4l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.9-6.3z"/>
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.7 2.2-7.6 2.2-6.2 0-11.5-4.2-13.4-9.8l-7.9 6.1C6.6 42.5 14.6 48 24 48z"/>
        </svg>
        Entrar com Google
      </button>

      <p style={{ fontSize: 11, color: 'var(--color-text3)', marginTop: '2rem', textAlign: 'center', maxWidth: 260 }}>
        Seus dados ficam salvos na sua própria planilha do Google Sheets.
      </p>
    </div>
  )
}
