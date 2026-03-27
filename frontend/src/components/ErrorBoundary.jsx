import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF8F5',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <span style={{fontSize: 48}}>🌱</span>
          <h2 style={{
            color: '#7C9A7E',
            fontWeight: 400,
            marginTop: 16
          }}>
            Algo salió mal
          </h2>
          <p style={{color: '#6B7280', marginTop: 8}}>
            Soledad está trabajando para resolverlo.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: 24,
              background: '#7C9A7E',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: 16
            }}
          >
            Volver al inicio
          </button>
          {import.meta.env.DEV && (
            <pre style={{
              marginTop: 24,
              fontSize: 11,
              color: '#EF4444',
              textAlign: 'left',
              maxWidth: 500
            }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
