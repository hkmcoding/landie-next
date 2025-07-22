import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// Simple component for testing
function TestComponent({ message }: { message: string }) {
  return <div data-testid="test-message">{message}</div>
}

describe('Sample Test', () => {
  it('should render test component', () => {
    render(<TestComponent message="Hello Test!" />)
    
    expect(screen.getByTestId('test-message')).toBeInTheDocument()
    expect(screen.getByText('Hello Test!')).toBeInTheDocument()
  })

  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2)
  })
})