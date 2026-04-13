import type { CSSProperties } from 'react'

export const colors = {
  bg: '#0F0F1A',
  card: '#1A1A2E',
  cardHover: '#222240',
  text: '#E0E0FF',
  textMuted: '#8888AA',
  primary: '#6C63FF',
  primaryHover: '#7B73FF',
  success: '#4CAF50',
  error: '#FF6B6B',
  warning: '#FFB74D',
  deferred: '#FFD700',
  border: '#2A2A4A',
} as const

export const baseStyles = {
  container: {
    minHeight: '100vh',
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    padding: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
  } satisfies CSSProperties,

  card: {
    backgroundColor: colors.card,
    borderRadius: '12px',
    padding: '1.5rem',
    border: `1px solid ${colors.border}`,
    marginBottom: '1rem',
  } satisfies CSSProperties,

  button: {
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1.2rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } satisfies CSSProperties,

  buttonSecondary: {
    backgroundColor: 'transparent',
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: '8px',
    padding: '0.6rem 1.2rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  } satisfies CSSProperties,

  buttonDanger: {
    backgroundColor: colors.error,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1.2rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  } satisfies CSSProperties,

  input: {
    backgroundColor: '#16162B',
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  } satisfies CSSProperties,

  select: {
    backgroundColor: '#16162B',
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.95rem',
    outline: 'none',
    cursor: 'pointer',
  } satisfies CSSProperties,

  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } satisfies CSSProperties,

  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 700,
  } satisfies CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.9rem',
  } satisfies CSSProperties,

  th: {
    textAlign: 'left' as const,
    padding: '0.6rem 0.8rem',
    borderBottom: `2px solid ${colors.border}`,
    color: colors.textMuted,
    fontWeight: 600,
    fontSize: '0.8rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } satisfies CSSProperties,

  td: {
    padding: '0.5rem 0.8rem',
    borderBottom: `1px solid ${colors.border}`,
  } satisfies CSSProperties,

  heading: {
    margin: '0 0 1rem 0',
    fontWeight: 700,
  } satisfies CSSProperties,

  flexRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  } satisfies CSSProperties,

  flexWrap: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
  } satisfies CSSProperties,

  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  } satisfies CSSProperties,

  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1rem',
  } satisfies CSSProperties,
}

export const statusEmoji: Record<string, string> = {
  alive: '🟢',
  eliminated: '🔴',
  deferred: '🟡',
}

export const outcomeEmoji: Record<string, string> = {
  win: '✅',
  loss: '❌',
  draw: '❌',
  postponed: '⏸️',
}
