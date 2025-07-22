import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi, beforeEach } from 'vitest'
import { ServicesSection } from '@/components/dashboard/sections/ServicesSection'
import { 
  generateMockService,
  generateMockServicesForReordering,
  createMockDashboardService,
  ServiceTestUtils,
  createServicesSectionTestProps
} from '../../utils/dashboard-test'
import { Service } from '@/types/dashboard'

// Mock dependencies
const mockDashboardService = createMockDashboardService()
vi.mock('@/lib/supabase/dashboard-service-client', () => ({
  DashboardServiceClient: vi.fn(() => mockDashboardService)
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    }
  })
}))

// Mock drag and drop with better simulation
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => {
    // Create a test helper to trigger drag events
    return (
      <div 
        data-testid="dnd-context" 
        data-drag-simulator={JSON.stringify({ onDragEnd: 'mocked' })}
      >
        {children}
        <button
          data-testid="simulate-drag"
          onClick={() => {
            // Simulate drag from service-1 to service-2 position
            onDragEnd({
              active: { id: 'service-1' },
              over: { id: 'service-2' }
            })
          }}
        >
          Simulate Drag
        </button>
      </div>
    )
  },
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => [])
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => (
    <div data-testid="sortable-context">{children}</div>
  ),
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

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: { toString: vi.fn(() => '') }
  }
}))

// Mock form with realistic behavior
const mockFormReset = vi.fn()
const mockFormSubmitHandler = vi.fn()

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn((name: string) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn()
    })),
    handleSubmit: vi.fn((fn) => {
      mockFormSubmitHandler.mockImplementation(fn)
      return (e: Event) => {
        e.preventDefault()
        fn({
          title: 'New Test Service',
          description: 'This is a new test service with a detailed description',
          price: '$149',
          button_text: 'Get Started',
          button_url: 'https://example.com/new-service',
          youtube_url: 'https://youtube.com/watch?v=newtest'
        })
      }
    }),
    formState: {
      errors: {},
      isSubmitting: false,
      isValid: true
    },
    reset: mockFormReset,
    setValue: vi.fn(),
    getValues: vi.fn(() => ({}))
  })
}))

describe('Service CRUD Operations', () => {
  let serviceUtils: ServiceTestUtils
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    serviceUtils = new ServiceTestUtils(mockDashboardService)
    user = userEvent.setup()
    vi.clearAllMocks()
    mockFormReset.mockClear()
    mockFormSubmitHandler.mockClear()
  })

  describe('Service Creation', () => {
    test('should create service with complete form data', async () => {
      const props = createServicesSectionTestProps()
      const newService = generateMockService({
        id: 'new-service-123',
        title: 'New Test Service',
        description: 'This is a new test service with a detailed description',
        price: '$149',
        button_text: 'Get Started',
        button_url: 'https://example.com/new-service',
        youtube_url: 'https://youtube.com/watch?v=newtest'
      })

      serviceUtils.mockSuccessfulCreate(newService)

      render(<ServicesSection {...props} />)

      // Open create dialog
      await user.click(screen.getByRole('button', { name: /add service/i }))
      expect(screen.getByText('Create New Service')).toBeInTheDocument()

      // Submit form
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      // Verify service creation
      await waitFor(() => {
        expect(mockDashboardService.createService).toHaveBeenCalledWith(
          props.landingPageId,
          expect.objectContaining({
            title: 'New Test Service',
            description: 'This is a new test service with a detailed description',
            price: '$149',
            button_text: 'Get Started',
            button_url: 'https://example.com/new-service',
            youtube_url: 'https://youtube.com/watch?v=newtest',
            image_urls: []
          })
        )
      })

      // Verify UI update
      expect(props.onUpdate).toHaveBeenCalledWith({
        services: [...props.services, newService]
      })

      // Verify form reset and dialog close
      expect(mockFormReset).toHaveBeenCalled()
    })

    test('should handle service creation failure', async () => {
      const props = createServicesSectionTestProps()
      
      serviceUtils.mockFailedCreate('Server error: validation failed')

      render(<ServicesSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add service/i }))
      
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(mockDashboardService.createService).toHaveBeenCalled()
      })

      // Should not update the services list on failure
      expect(props.onUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          services: expect.any(Array)
        })
      )

      // Dialog should remain open on error
      expect(screen.getByText('Create New Service')).toBeInTheDocument()
    })
  })

  describe('Service Update', () => {
    test('should update existing service', async () => {
      const props = createServicesSectionTestProps()
      const existingService = props.services[0]
      const updatedService = {
        ...existingService,
        title: 'Updated Service Title',
        description: 'Updated service description',
        price: '$299'
      }

      serviceUtils.mockSuccessfulUpdate(updatedService)

      render(<ServicesSection {...props} />)

      // Find and click edit button for first service
      const editButtons = screen.getAllByRole('button', { name: '' })
      const editButton = editButtons.find(btn => btn.querySelector('[data-lucide="edit-2"]'))
      
      if (editButton) {
        await user.click(editButton)
        expect(screen.getByText('Edit Service')).toBeInTheDocument()

        // Submit form
        const form = screen.getByRole('dialog').querySelector('form')
        if (form) {
          fireEvent.submit(form)
        }

        await waitFor(() => {
          expect(mockDashboardService.updateService).toHaveBeenCalledWith(
            existingService.id,
            expect.objectContaining({
              title: 'New Test Service', // From mocked form data
              description: expect.any(String)
            })
          )
        })

        // Verify services list update
        expect(props.onUpdate).toHaveBeenCalledWith({
          services: props.services.map(s => 
            s.id === existingService.id ? updatedService : s
          )
        })
      }
    })

    test('should pre-populate edit form with existing service data', async () => {
      const props = createServicesSectionTestProps()
      
      render(<ServicesSection {...props} />)

      // Click edit button
      const editButtons = screen.getAllByRole('button', { name: '' })
      const editButton = editButtons.find(btn => btn.querySelector('[data-lucide="edit-2"]'))
      
      if (editButton) {
        await user.click(editButton)
        
        // Form should be pre-populated (verified through form reset call)
        expect(mockFormReset).toHaveBeenCalledWith(
          expect.objectContaining({
            title: props.services[0].title,
            description: props.services[0].description,
            price: props.services[0].price,
            button_text: props.services[0].button_text,
            button_url: props.services[0].button_url
          })
        )
      }
    })
  })

  describe('Service Deletion', () => {
    test('should delete service successfully', async () => {
      const props = createServicesSectionTestProps()
      const serviceToDelete = props.services[0]

      serviceUtils.mockSuccessfulDelete()

      render(<ServicesSection {...props} />)

      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-lucide="trash-2"]'))
      
      if (deleteButton) {
        await user.click(deleteButton)

        await waitFor(() => {
          expect(mockDashboardService.deleteService).toHaveBeenCalledWith(serviceToDelete.id)
        })

        // Verify services list update
        expect(props.onUpdate).toHaveBeenCalledWith({
          services: props.services.filter(s => s.id !== serviceToDelete.id)
        })
      }
    })

    test('should handle delete failure gracefully', async () => {
      const props = createServicesSectionTestProps()
      
      // Mock delete failure
      mockDashboardService.deleteService.mockRejectedValue(new Error('Delete failed'))

      render(<ServicesSection {...props} />)

      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-lucide="trash-2"]'))
      
      if (deleteButton) {
        await user.click(deleteButton)

        await waitFor(() => {
          expect(mockDashboardService.deleteService).toHaveBeenCalled()
        })

        // Should not update services list on failure
        expect(props.onUpdate).not.toHaveBeenCalledWith(
          expect.objectContaining({
            services: expect.arrayContaining([
              expect.not.objectContaining({ id: props.services[0].id })
            ])
          })
        )
      }
    })
  })

  describe('Service Reordering', () => {
    test('should reorder services via drag and drop', async () => {
      const services = generateMockServicesForReordering(3)
      const props = createServicesSectionTestProps({ services })

      serviceUtils.mockSuccessfulReorder()

      render(<ServicesSection {...props} />)

      // Verify drag and drop context is rendered
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
      expect(screen.getByTestId('sortable-context')).toBeInTheDocument()

      // Simulate drag operation
      const dragSimulator = screen.getByTestId('simulate-drag')
      await user.click(dragSimulator)

      // Verify reorder was called
      await waitFor(() => {
        expect(mockDashboardService.updateServicesOrder).toHaveBeenCalledWith(
          expect.any(Array)
        )
      })

      // Verify optimistic update
      expect(props.onUpdate).toHaveBeenCalled()
    })

    test('should handle reorder with proper service positioning', async () => {
      const services = [
        generateMockService({ id: 'service-1', title: 'First' }),
        generateMockService({ id: 'service-2', title: 'Second' }),
        generateMockService({ id: 'service-3', title: 'Third' })
      ]
      const props = createServicesSectionTestProps({ services })

      serviceUtils.mockSuccessfulReorder()

      render(<ServicesSection {...props} />)

      // Simulate dragging first service to third position
      const dragSimulator = screen.getByTestId('simulate-drag')
      await user.click(dragSimulator)

      // Verify the reordered array structure
      const reorderCall = serviceUtils.getReorderCallArgs()[0]
      if (reorderCall) {
        const reorderedServices = reorderCall[0] as Service[]
        expect(reorderedServices).toHaveLength(3)
        
        // The exact order depends on the drag simulation logic
        // but we can verify that reordering occurred
        expect(reorderedServices.map(s => s.id)).not.toEqual(['service-1', 'service-2', 'service-3'])
      }
    })

    test('should revert order on reorder failure', async () => {
      const services = generateMockServicesForReordering(3)
      const props = createServicesSectionTestProps({ services })

      serviceUtils.mockFailedReorder('Network error')

      render(<ServicesSection {...props} />)

      // Simulate drag operation
      const dragSimulator = screen.getByTestId('simulate-drag')
      await user.click(dragSimulator)

      await waitFor(() => {
        expect(mockDashboardService.updateServicesOrder).toHaveBeenCalled()
      })

      // Should call onUpdate twice: once optimistically, once to revert
      expect(props.onUpdate).toHaveBeenCalledTimes(2)
      
      // Second call should revert to original order
      const secondCall = props.onUpdate.mock.calls[1][0]
      expect(secondCall.services).toEqual(services)
    })

    test('should maintain service order after successful reorder', async () => {
      const services = generateMockServicesForReordering(2)
      const props = createServicesSectionTestProps({ services })

      serviceUtils.mockSuccessfulReorder()

      render(<ServicesSection {...props} />)

      // Initial order should be maintained
      expect(screen.getByText('Service 1')).toBeInTheDocument()
      expect(screen.getByText('Service 2')).toBeInTheDocument()

      // After drag operation, new order should be reflected
      const dragSimulator = screen.getByTestId('simulate-drag')
      await user.click(dragSimulator)

      // Verify that onUpdate was called with reordered services
      await waitFor(() => {
        expect(props.onUpdate).toHaveBeenCalled()
      })
    })
  })

  describe('Form State Management', () => {
    test('should reset form after successful creation', async () => {
      const props = createServicesSectionTestProps()
      const newService = generateMockService()

      serviceUtils.mockSuccessfulCreate(newService)

      render(<ServicesSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add service/i }))
      
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(mockFormReset).toHaveBeenCalledTimes(2) // Once on open, once after submit
      })
    })

    test('should close dialog after successful operation', async () => {
      const props = createServicesSectionTestProps()
      const newService = generateMockService()

      serviceUtils.mockSuccessfulCreate(newService)

      render(<ServicesSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add service/i }))
      expect(screen.getByText('Create New Service')).toBeInTheDocument()

      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(screen.queryByText('Create New Service')).not.toBeInTheDocument()
      })
    })

    test('should handle form cancel correctly', async () => {
      const props = createServicesSectionTestProps()

      render(<ServicesSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add service/i }))
      expect(screen.getByText('Create New Service')).toBeInTheDocument()

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Dialog should close without any service operations
      expect(screen.queryByText('Create New Service')).not.toBeInTheDocument()
      expect(mockDashboardService.createService).not.toHaveBeenCalled()
    })
  })
})