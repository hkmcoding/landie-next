import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi, beforeEach } from 'vitest'
import { HighlightsSection } from '@/components/dashboard/sections/HighlightsSection'
import { Highlight } from '@/types/dashboard'

// Mock data generators
const generateMockHighlight = (overrides: Partial<Highlight> = {}): Highlight => ({
  id: `highlight-${Date.now()}`,
  landing_page_id: 'test-landing-page',
  title: 'Test Highlight',
  description: 'This is a test highlight description',
  order_index: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

const createHighlightsSectionProps = (overrides: any = {}) => ({
  landingPageId: 'test-landing-page',
  highlights: [
    generateMockHighlight({ id: 'highlight-1', title: 'First Highlight', order_index: 0 }),
    generateMockHighlight({ id: 'highlight-2', title: 'Second Highlight', order_index: 1 })
  ],
  onUpdate: vi.fn(),
  ...overrides
})

// Mock dashboard service
const mockDashboardService = {
  createHighlight: vi.fn(),
  updateHighlight: vi.fn(),
  deleteHighlight: vi.fn(),
  updateHighlightsOrder: vi.fn()
}

vi.mock('@/lib/supabase/dashboard-service-client', () => ({
  DashboardServiceClient: vi.fn(() => mockDashboardService)
}))

// Mock drag and drop
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => (
    <div data-testid="dnd-context">
      {children}
      <button
        data-testid="simulate-highlights-drag"
        onClick={() => onDragEnd({
          active: { id: 'highlight-1' },
          over: { id: 'highlight-2' }
        })}
      >
        Simulate Drag
      </button>
    </div>
  ),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => [])
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
  useSortable: vi.fn((props) => ({
    attributes: { 'data-sortable-id': props.id },
    listeners: { onMouseDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false
  }))
}))

// Mock form
const mockFormReset = vi.fn()
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
    handleSubmit: vi.fn((fn) => (e: Event) => {
      e.preventDefault()
      fn({
        title: 'New Test Highlight',
        description: 'This is a new test highlight with detailed description'
      })
    }),
    formState: { errors: {}, isSubmitting: false, isValid: true },
    reset: mockFormReset,
    setValue: vi.fn(),
    getValues: vi.fn(() => ({}))
  })
}))

describe('Highlights CRUD Operations', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockFormReset.mockClear()
  })

  describe('Highlight Creation', () => {
    test('should create new highlight', async () => {
      const props = createHighlightsSectionProps()
      const newHighlight = generateMockHighlight({
        id: 'new-highlight-123',
        title: 'New Test Highlight',
        description: 'This is a new test highlight with detailed description'
      })

      mockDashboardService.createHighlight.mockResolvedValue(newHighlight)

      render(<HighlightsSection {...props} />)

      // Open create dialog
      await user.click(screen.getByRole('button', { name: /add highlight/i }))
      expect(screen.getByText('Create New Highlight')).toBeInTheDocument()

      // Submit form
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      // Verify highlight creation
      await waitFor(() => {
        expect(mockDashboardService.createHighlight).toHaveBeenCalledWith(
          props.landingPageId,
          expect.objectContaining({
            title: 'New Test Highlight',
            description: 'This is a new test highlight with detailed description'
          })
        )
      })

      // Verify UI update
      expect(props.onUpdate).toHaveBeenCalledWith({
        highlights: [...props.highlights, newHighlight]
      })
    })

    test('should handle highlight creation failure', async () => {
      const props = createHighlightsSectionProps()
      
      mockDashboardService.createHighlight.mockRejectedValue(new Error('Creation failed'))

      render(<HighlightsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add highlight/i }))
      
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(mockDashboardService.createHighlight).toHaveBeenCalled()
      })

      // Should not update highlights list on failure
      expect(props.onUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Highlight Update', () => {
    test('should update existing highlight', async () => {
      const props = createHighlightsSectionProps()
      const existingHighlight = props.highlights[0]
      const updatedHighlight = {
        ...existingHighlight,
        title: 'Updated Highlight Title',
        description: 'Updated highlight description'
      }

      mockDashboardService.updateHighlight.mockResolvedValue(updatedHighlight)

      render(<HighlightsSection {...props} />)

      // Find and click edit button
      const editButtons = screen.getAllByRole('button', { name: '' })
      const editButton = editButtons.find(btn => btn.querySelector('[data-lucide="edit-2"]'))
      
      if (editButton) {
        await user.click(editButton)
        expect(screen.getByText('Edit Highlight')).toBeInTheDocument()

        // Submit form
        const form = screen.getByRole('dialog').querySelector('form')
        if (form) {
          fireEvent.submit(form)
        }

        await waitFor(() => {
          expect(mockDashboardService.updateHighlight).toHaveBeenCalledWith(
            existingHighlight.id,
            expect.objectContaining({
              title: 'New Test Highlight', // From mocked form data
              description: expect.any(String)
            })
          )
        })

        // Verify highlights list update
        expect(props.onUpdate).toHaveBeenCalledWith({
          highlights: props.highlights.map(h => 
            h.id === existingHighlight.id ? updatedHighlight : h
          )
        })
      }
    })

    test('should pre-populate edit form', async () => {
      const props = createHighlightsSectionProps()
      
      render(<HighlightsSection {...props} />)

      const editButtons = screen.getAllByRole('button', { name: '' })
      const editButton = editButtons.find(btn => btn.querySelector('[data-lucide="edit-2"]'))
      
      if (editButton) {
        await user.click(editButton)
        
        expect(mockFormReset).toHaveBeenCalledWith(
          expect.objectContaining({
            title: props.highlights[0].title,
            description: props.highlights[0].description
          })
        )
      }
    })
  })

  describe('Highlight Deletion', () => {
    test('should delete highlight successfully', async () => {
      const props = createHighlightsSectionProps()
      const highlightToDelete = props.highlights[0]

      mockDashboardService.deleteHighlight.mockResolvedValue(undefined)

      render(<HighlightsSection {...props} />)

      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-lucide="trash-2"]'))
      
      if (deleteButton) {
        await user.click(deleteButton)

        await waitFor(() => {
          expect(mockDashboardService.deleteHighlight).toHaveBeenCalledWith(highlightToDelete.id)
        })

        // Verify highlights list update
        expect(props.onUpdate).toHaveBeenCalledWith({
          highlights: props.highlights.filter(h => h.id !== highlightToDelete.id)
        })
      }
    })

    test('should handle delete failure', async () => {
      const props = createHighlightsSectionProps()
      
      mockDashboardService.deleteHighlight.mockRejectedValue(new Error('Delete failed'))

      render(<HighlightsSection {...props} />)

      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-lucide="trash-2"]'))
      
      if (deleteButton) {
        await user.click(deleteButton)

        await waitFor(() => {
          expect(mockDashboardService.deleteHighlight).toHaveBeenCalled()
        })

        // Should not update highlights list on failure
        expect(props.onUpdate).not.toHaveBeenCalled()
      }
    })
  })

  describe('Highlight Reordering', () => {
    test('should reorder highlights via drag and drop', async () => {
      const highlights = [
        generateMockHighlight({ id: 'highlight-1', title: 'First', order_index: 0 }),
        generateMockHighlight({ id: 'highlight-2', title: 'Second', order_index: 1 }),
        generateMockHighlight({ id: 'highlight-3', title: 'Third', order_index: 2 })
      ]
      const props = createHighlightsSectionProps({ highlights })

      mockDashboardService.updateHighlightsOrder.mockResolvedValue(undefined)

      render(<HighlightsSection {...props} />)

      // Verify drag and drop context
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
      expect(screen.getByTestId('sortable-context')).toBeInTheDocument()

      // Simulate drag operation
      const dragSimulator = screen.getByTestId('simulate-highlights-drag')
      await user.click(dragSimulator)

      // Verify reorder was called
      await waitFor(() => {
        expect(mockDashboardService.updateHighlightsOrder).toHaveBeenCalled()
      })

      // Verify optimistic update
      expect(props.onUpdate).toHaveBeenCalled()
    })

    test('should revert order on reorder failure', async () => {
      const highlights = [
        generateMockHighlight({ id: 'highlight-1', title: 'First', order_index: 0 }),
        generateMockHighlight({ id: 'highlight-2', title: 'Second', order_index: 1 })
      ]
      const props = createHighlightsSectionProps({ highlights })

      mockDashboardService.updateHighlightsOrder.mockRejectedValue(new Error('Reorder failed'))

      render(<HighlightsSection {...props} />)

      const dragSimulator = screen.getByTestId('simulate-highlights-drag')
      await user.click(dragSimulator)

      await waitFor(() => {
        expect(mockDashboardService.updateHighlightsOrder).toHaveBeenCalled()
      })

      // Should call onUpdate twice: optimistic update, then revert
      expect(props.onUpdate).toHaveBeenCalledTimes(2)
      
      // Second call should revert to original order
      const secondCall = props.onUpdate.mock.calls[1][0]
      expect(secondCall.highlights).toEqual(highlights)
    })
  })

  describe('Form Validation', () => {
    test('should validate required fields', async () => {
      const props = createHighlightsSectionProps()

      // Mock form with validation errors
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            title: { message: 'Title is required' },
            description: { message: 'Description is required' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({}))
      })

      render(<HighlightsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add highlight/i }))

      // Should show validation errors
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
    })

    test('should disable submit button when form is invalid', async () => {
      const props = createHighlightsSectionProps()

      // Mock invalid form state
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { errors: {}, isSubmitting: false, isValid: false },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({}))
      })

      render(<HighlightsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add highlight/i }))

      const submitButton = screen.getByRole('button', { name: /create highlight/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('UI State Management', () => {
    test('should close dialog after successful creation', async () => {
      const props = createHighlightsSectionProps()
      const newHighlight = generateMockHighlight()

      mockDashboardService.createHighlight.mockResolvedValue(newHighlight)

      render(<HighlightsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add highlight/i }))
      expect(screen.getByText('Create New Highlight')).toBeInTheDocument()

      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(screen.queryByText('Create New Highlight')).not.toBeInTheDocument()
      })
    })

    test('should handle form cancel', async () => {
      const props = createHighlightsSectionProps()

      render(<HighlightsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add highlight/i }))
      expect(screen.getByText('Create New Highlight')).toBeInTheDocument()

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(screen.queryByText('Create New Highlight')).not.toBeInTheDocument()
      expect(mockDashboardService.createHighlight).not.toHaveBeenCalled()
    })
  })
})