type Props = {
    error: string | null
}

export function AppHeader({
  error,
  }: Props) {
  return (
    <header className="App-header">
      <h1>習慣トラッカー</h1>
      {error && <div className="error">{error}</div>}
    </header>
  )
};
