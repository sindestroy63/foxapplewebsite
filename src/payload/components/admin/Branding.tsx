export function LoginLogo() {
  return (
    <div
      aria-label="ФОХСТОР"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 900,
        lineHeight: 0.95,
        letterSpacing: '-0.04em',
        color: '#000',
        marginBottom: 32,
      }}
    >
      <span style={{ fontSize: 52 }}>ФОХ</span>
      <span style={{ fontSize: 52 }}>СТОР.</span>
      <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', color: '#888', marginTop: 8 }}>
        Apple техника в Самаре
      </span>
    </div>
  )
}

export function NavIcon() {
  return (
    <span
      aria-label="ФОХСТОР"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 900,
        fontSize: 14,
        lineHeight: 1,
        letterSpacing: '-0.03em',
        color: 'currentColor',
        whiteSpace: 'nowrap',
      }}
    >
      ФОХСТОР.
    </span>
  )
}
