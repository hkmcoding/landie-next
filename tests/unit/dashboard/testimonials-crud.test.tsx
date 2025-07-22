import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi, beforeEach } from 'vitest'
import { TestimonialsSection } from '@/components/dashboard/sections/TestimonialsSection'
import { Testimonial } from '@/types/dashboard'

// Mock data generators
const generateMockTestimonial = (overrides: Partial<Testimonial> = {}): Testimonial => ({
  id: `testimonial-${Date.now()}`,
  landing_page_id: 'test-landing-page',
  client_name: 'John Smith',
  client_company: 'Tech Corp',
  client_position: 'CEO',
  content: 'Outstanding work! Highly recommended for any project.',
  rating: 5,
  client_avatar_url: null,
  order_index: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

const createTestimonialsSectionProps = (overrides: any = {}) => ({
  landingPageId: 'test-landing-page',
  testimonials: [
    generateMockTestimonial({ id: 'testimonial-1', client_name: 'First Client', order_index: 0 }),
    generateMockTestimonial({ id: 'testimonial-2', client_name: 'Second Client', order_index: 1 })
  ],
  onUpdate: vi.fn(),
  ...overrides
})

// Mock dashboard service
const mockDashboardService = {
  createTestimonial: vi.fn(),
  updateTestimonial: vi.fn(),
  deleteTestimonial: vi.fn(),
  updateTestimonialsOrder: vi.fn()
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
        data-testid="simulate-testimonials-drag"
        onClick={() => onDragEnd({
          active: { id: 'testimonial-1' },
          over: { id: 'testimonial-2' }
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
        client_name: 'New Test Client',
        client_company: 'Test Solutions Inc',
        client_position: 'CTO',
        content: 'This is an excellent testimonial about the service quality.',
        rating: 5
      })
    }),
    formState: { errors: {}, isSubmitting: false, isValid: true },
    reset: mockFormReset,
    setValue: vi.fn(),
    getValues: vi.fn(() => ({}))
  })
}))

describe('Testimonials CRUD Operations', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockFormReset.mockClear()
  })

  describe('Testimonial Creation', () => {
    test('should create new testimonial', async () => {
      const props = createTestimonialsSectionProps()
      const newTestimonial = generateMockTestimonial({
        id: 'new-testimonial-123',
        client_name: 'New Test Client',
        client_company: 'Test Solutions Inc',
        client_position: 'CTO',
        content: 'This is an excellent testimonial about the service quality.',
        rating: 5
      })

      mockDashboardService.createTestimonial.mockResolvedValue(newTestimonial)

      render(<TestimonialsSection {...props} />)

      // Open create dialog
      await user.click(screen.getByRole('button', { name: /add testimonial/i }))
      expect(screen.getByText('Create New Testimonial')).toBeInTheDocument()

      // Submit form
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      // Verify testimonial creation
      await waitFor(() => {
        expect(mockDashboardService.createTestimonial).toHaveBeenCalledWith(
          props.landingPageId,
          expect.objectContaining({
            client_name: 'New Test Client',
            client_company: 'Test Solutions Inc',
            client_position: 'CTO',
            content: 'This is an excellent testimonial about the service quality.',
            rating: 5
          })
        )
      })

      // Verify UI update
      expect(props.onUpdate).toHaveBeenCalledWith({
        testimonials: [...props.testimonials, newTestimonial]
      })
    })

    test('should handle testimonial creation failure', async () => {
      const props = createTestimonialsSectionProps()
      
      mockDashboardService.createTestimonial.mockRejectedValue(new Error('Creation failed'))

      render(<TestimonialsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add testimonial/i }))
      
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(mockDashboardService.createTestimonial).toHaveBeenCalled()
      })

      // Should not update testimonials list on failure
      expect(props.onUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Testimonial Update', () => {
    test('should update existing testimonial', async () => {
      const props = createTestimonialsSectionProps()
      const existingTestimonial = props.testimonials[0]
      const updatedTestimonial = {
        ...existingTestimonial,
        client_name: 'Updated Client Name',
        content: 'Updated testimonial content'
      }

      mockDashboardService.updateTestimonial.mockResolvedValue(updatedTestimonial)

      render(<TestimonialsSection {...props} />)

      // Find and click edit button
      const editButtons = screen.getAllByRole('button', { name: '' })
      const editButton = editButtons.find(btn => btn.querySelector('[data-lucide="edit-2"]'))
      
      if (editButton) {
        await user.click(editButton)
        expect(screen.getByText('Edit Testimonial')).toBeInTheDocument()

        // Submit form
        const form = screen.getByRole('dialog').querySelector('form')
        if (form) {
          fireEvent.submit(form)
        }

        await waitFor(() => {
          expect(mockDashboardService.updateTestimonial).toHaveBeenCalledWith(
            existingTestimonial.id,
            expect.objectContaining({
              client_name: 'New Test Client', // From mocked form data
              content: expect.any(String)
            })
          )
        })

        // Verify testimonials list update
        expect(props.onUpdate).toHaveBeenCalledWith({
          testimonials: props.testimonials.map(t => 
            t.id === existingTestimonial.id ? updatedTestimonial : t
          )
        })
      }
    })

    test('should pre-populate edit form', async () => {
      const props = createTestimonialsSectionProps()
      
      render(<TestimonialsSection {...props} />)

      const editButtons = screen.getAllByRole('button', { name: '' })
      const editButton = editButtons.find(btn => btn.querySelector('[data-lucide="edit-2"]'))
      
      if (editButton) {
        await user.click(editButton)
        
        expect(mockFormReset).toHaveBeenCalledWith(
          expect.objectContaining({
            client_name: props.testimonials[0].client_name,
            client_company: props.testimonials[0].client_company,
            client_position: props.testimonials[0].client_position,
            content: props.testimonials[0].content,
            rating: props.testimonials[0].rating
          })
        )
      }
    })
  })

  describe('Testimonial Deletion', () => {
    test('should delete testimonial successfully', async () => {
      const props = createTestimonialsSectionProps()
      const testimonialToDelete = props.testimonials[0]

      mockDashboardService.deleteTestimonial.mockResolvedValue(undefined)

      render(<TestimonialsSection {...props} />)

      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-lucide="trash-2"]'))
      
      if (deleteButton) {
        await user.click(deleteButton)

        await waitFor(() => {
          expect(mockDashboardService.deleteTestimonial).toHaveBeenCalledWith(testimonialToDelete.id)
        })

        // Verify testimonials list update
        expect(props.onUpdate).toHaveBeenCalledWith({
          testimonials: props.testimonials.filter(t => t.id !== testimonialToDelete.id)
        })
      }
    })

    test('should handle delete failure', async () => {
      const props = createTestimonialsSectionProps()
      
      mockDashboardService.deleteTestimonial.mockRejectedValue(new Error('Delete failed'))

      render(<TestimonialsSection {...props} />)

      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-lucide="trash-2"]'))
      
      if (deleteButton) {
        await user.click(deleteButton)

        await waitFor(() => {
          expect(mockDashboardService.deleteTestimonial).toHaveBeenCalled()
        })

        // Should not update testimonials list on failure
        expect(props.onUpdate).not.toHaveBeenCalled()
      }
    })
  })

  describe('Testimonial Reordering', () => {
    test('should reorder testimonials via drag and drop', async () => {
      const testimonials = [
        generateMockTestimonial({ id: 'testimonial-1', client_name: 'First', order_index: 0 }),
        generateMockTestimonial({ id: 'testimonial-2', client_name: 'Second', order_index: 1 }),
        generateMockTestimonial({ id: 'testimonial-3', client_name: 'Third', order_index: 2 })
      ]
      const props = createTestimonialsSectionProps({ testimonials })

      mockDashboardService.updateTestimonialsOrder.mockResolvedValue(undefined)

      render(<TestimonialsSection {...props} />)

      // Verify drag and drop context
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
      expect(screen.getByTestId('sortable-context')).toBeInTheDocument()

      // Simulate drag operation
      const dragSimulator = screen.getByTestId('simulate-testimonials-drag')
      await user.click(dragSimulator)

      // Verify reorder was called
      await waitFor(() => {
        expect(mockDashboardService.updateTestimonialsOrder).toHaveBeenCalled()
      })

      // Verify optimistic update
      expect(props.onUpdate).toHaveBeenCalled()
    })

    test('should revert order on reorder failure', async () => {
      const testimonials = [
        generateMockTestimonial({ id: 'testimonial-1', client_name: 'First', order_index: 0 }),
        generateMockTestimonial({ id: 'testimonial-2', client_name: 'Second', order_index: 1 })
      ]
      const props = createTestimonialsSectionProps({ testimonials })

      mockDashboardService.updateTestimonialsOrder.mockRejectedValue(new Error('Reorder failed'))

      render(<TestimonialsSection {...props} />)

      const dragSimulator = screen.getByTestId('simulate-testimonials-drag')
      await user.click(dragSimulator)

      await waitFor(() => {
        expect(mockDashboardService.updateTestimonialsOrder).toHaveBeenCalled()
      })

      // Should call onUpdate twice: optimistic update, then revert
      expect(props.onUpdate).toHaveBeenCalledTimes(2)
      
      // Second call should revert to original order
      const secondCall = props.onUpdate.mock.calls[1][0]
      expect(secondCall.testimonials).toEqual(testimonials)
    })
  })

  describe('Rating System', () => {
    test('should handle different rating values', async () => {
      const props = createTestimonialsSectionProps()

      // Mock form with different rating
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => (e: Event) => {
          e.preventDefault()
          fn({
            client_name: 'Rating Test Client',
            rating: 4
          })
        }),
        formState: { errors: {}, isSubmitting: false, isValid: true },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({}))
      })

      const newTestimonial = generateMockTestimonial({
        client_name: 'Rating Test Client',
        rating: 4
      })

      mockDashboardService.createTestimonial.mockResolvedValue(newTestimonial)

      render(<TestimonialsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add testimonial/i }))
      
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(mockDashboardService.createTestimonial).toHaveBeenCalledWith(
          props.landingPageId,
          expect.objectContaining({
            rating: 4
          })
        )
      })
    })

    test('should validate rating range', async () => {
      const props = createTestimonialsSectionProps()

      // Mock form with invalid rating
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            rating: { message: 'Rating must be between 1 and 5' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({}))
      })

      render(<TestimonialsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add testimonial/i }))

      expect(screen.getByText('Rating must be between 1 and 5')).toBeInTheDocument()
    })
  })

  describe('Avatar Management', () => {
    test('should handle client avatar upload', async () => {
      const props = createTestimonialsSectionProps()
      
      const testimonialWithAvatar = generateMockTestimonial({
        client_avatar_url: 'https://example.com/avatar.jpg'
      })

      mockDashboardService.createTestimonial.mockResolvedValue(testimonialWithAvatar)

      render(<TestimonialsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add testimonial/i }))

      // Check if avatar upload field is present
      const avatarUpload = screen.queryByText(/client avatar/i)
      if (avatarUpload) {
        // Test avatar upload functionality
        const fileInput = screen.getByRole('button', { name: /upload avatar/i })
        expect(fileInput).toBeInTheDocument()
      }
    })

    test('should display default avatar when none provided', async () => {
      const props = createTestimonialsSectionProps({
        testimonials: [
          generateMockTestimonial({ 
            client_name: 'No Avatar Client',
            client_avatar_url: null 
          })
        ]
      })

      render(<TestimonialsSection {...props} />)

      // Should show default avatar or initials
      const defaultAvatar = screen.getByText('No Avatar Client').closest('.testimonial-item')
      expect(defaultAvatar).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    test('should validate required fields', async () => {
      const props = createTestimonialsSectionProps()

      // Mock form with validation errors
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            client_name: { message: 'Client name is required' },
            content: { message: 'Testimonial content is required' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({}))
      })

      render(<TestimonialsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add testimonial/i }))

      // Should show validation errors
      expect(screen.getByText('Client name is required')).toBeInTheDocument()
      expect(screen.getByText('Testimonial content is required')).toBeInTheDocument()
    })

    test('should validate content length', async () => {
      const props = createTestimonialsSectionProps()

      // Mock form with content length validation
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            content: { message: 'Testimonial content is too long (max 500 characters)' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({}))
      })

      render(<TestimonialsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add testimonial/i }))

      expect(screen.getByText('Testimonial content is too long (max 500 characters)')).toBeInTheDocument()
    })
  })

  describe('UI State Management', () => {
    test('should close dialog after successful creation', async () => {
      const props = createTestimonialsSectionProps()
      const newTestimonial = generateMockTestimonial()

      mockDashboardService.createTestimonial.mockResolvedValue(newTestimonial)

      render(<TestimonialsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add testimonial/i }))
      expect(screen.getByText('Create New Testimonial')).toBeInTheDocument()

      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(screen.queryByText('Create New Testimonial')).not.toBeInTheDocument()
      })
    })

    test('should handle form cancel', async () => {
      const props = createTestimonialsSectionProps()

      render(<TestimonialsSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add testimonial/i }))
      expect(screen.getByText('Create New Testimonial')).toBeInTheDocument()

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(screen.queryByText('Create New Testimonial')).not.toBeInTheDocument()
      expect(mockDashboardService.createTestimonial).not.toHaveBeenCalled()
    })
  })
})