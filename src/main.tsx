import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx'

// Monkey patch Node.prototype.removeChild and insertBefore to prevent crashes caused by
// browser translation extensions (e.g. Google Chrome Translate) wrapping or altering DOM text nodes.
if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (console) {
        console.warn('DOM reconciliation notice: Cannot remove child from a different parent node', child, this)
      }
      return child
    }
    return originalRemoveChild.apply(this, [child]) as T
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) {
        console.warn('DOM reconciliation notice: Cannot insert before reference node from a different parent', referenceNode, this)
      }
      return newNode
    }
    return originalInsertBefore.apply(this, [newNode, referenceNode]) as T
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
