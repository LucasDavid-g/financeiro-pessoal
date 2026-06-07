import { useState } from 'react'
import { getBankLogo } from '../../data/defaults.js'

export function BankLogo({ nome, cor, size = 32 }) {
  const [error, setError] = useState(false)
  const logo = getBankLogo(nome)

  if (logo && !error) {
    return (
      <div style={{
        width: size, height: size,
        borderRadius: size * 0.28,
        background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
        padding: 3,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <img
          src={logo}
          alt={nome}
          style={{
            width: '100%', height: '100%',
            objectFit: 'contain',
          }}
          onError={() => setError(true)}
        />
      </div>
    )
  }

  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.28,
      background: cor || '#6366f1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontSize: size * 0.4,
      fontWeight: 700,
      color: '#fff',
    }}>
      {nome?.[0]?.toUpperCase() || '?'}
    </div>
  )
}
