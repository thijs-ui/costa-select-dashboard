'use client'

export default function SamenwerkingenError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 18, color: '#B81D13', marginBottom: 12 }}>Er ging iets mis op de samenwerkingen-pagina</h1>
      <pre style={{
        fontSize: 12,
        background: '#fff8f7',
        border: '1px solid #f5c2bd',
        padding: 12,
        borderRadius: 6,
        maxWidth: 900,
        overflow: 'auto',
        color: '#5a1612',
        whiteSpace: 'pre-wrap',
      }}>
        {error.message}
        {error.digest && `\n\ndigest: ${error.digest}`}
        {error.stack && `\n\n${error.stack}`}
      </pre>
      <button
        onClick={reset}
        style={{
          marginTop: 16,
          padding: '8px 14px',
          border: '1px solid #004B46',
          borderRadius: 6,
          background: '#004B46',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        Probeer opnieuw
      </button>
    </div>
  )
}
