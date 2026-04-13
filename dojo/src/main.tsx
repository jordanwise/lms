import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App.tsx'

// Global CSS reset
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    background: #0F0F1A;
    color: #E0E0FF;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  html {
    scroll-behavior: smooth;
  }
  select option {
    background: #16162B;
    color: #E0E0FF;
  }
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #0F0F1A;
  }
  ::-webkit-scrollbar-thumb {
    background: #2A2A4A;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #3A3A5A;
  }
`
document.head.appendChild(style)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
