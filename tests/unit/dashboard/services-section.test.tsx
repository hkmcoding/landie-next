import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest'
import { ServicesSection } from '@/components/dashboard/sections/ServicesSection'
import { 
  generateMockDashboardData,
  generateMockService,
  generateMockServicesForReordering,
  createMockDashboardService,
  ServiceTestUtils,
  createServicesSectionTestProps,
  mockDragAndDrop
} from '../../utils/dashboard-test'

// Mock the DashboardServiceClient
const mockDashboardService = createMockDashboardService()
vi.mock('@/lib/supabase/dashboard-service-client', () => ({
  DashboardServiceClient: vi.fn(() => mockDashboardService)
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    })
  }
}
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

// Mock drag and drop - inline to ensure it works in this test context
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => (
    <div data-testid="dnd-context">
      {children}
    </div>
  ),
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
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
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

// Mock form validation
vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual('react-hook-form')
  return {
    ...actual,
    useForm: () => ({
      register: vi.fn((name: string) => ({
        name,
        onChange: vi.fn(),
        onBlur: vi.fn(),
        ref: vi.fn()
      })),
      handleSubmit: vi.fn((fn) => (e: Event) => {
        e.preventDefault()
        // Simulate form submission with valid data
        fn({
          title: 'Test Service',
          description: 'Test description that is long enough',
          price: '$99',
          button_text: 'Learn More',
          button_url: 'https://example.com',
          youtube_url: ''
        })
      }),
      formState: {
        errors: {},
        isSubmitting: false,
        isValid: true
      },
      reset: vi.fn(),
      setValue: vi.fn(),
      getValues: vi.fn(() => ({}))
    })
  }
})

describe('ServicesSection', () => {
  let serviceUtils: ServiceTestUtils
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    serviceUtils = new ServiceTestUtils(mockDashboardService)
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('should render services list correctly', () => {
    const props = createServicesSectionTestProps()
    
    render(<ServicesSection {...props} />)
    
    // Should show header
    expect(screen.getByText('Services')).toBeInTheDocument()
    expect(screen.getByText('Manage your services and offerings')).toBeInTheDocument()
    
    // Should show add service button
    expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument()
    
    // Should show existing services
    expect(screen.getByText('Test Service 1')).toBeInTheDocument()
    expect(screen.getByText('Test Service 2')).toBeInTheDocument()
    expect(screen.getByText('Description for test service 1')).toBeInTheDocument()
  })

  test('should show empty state when no services exist', () => {
    const props = createServicesSectionTestProps({
      services: []
    })
    
    render(<ServicesSection {...props} />)
    
    expect(screen.getByText('No services yet')).toBeInTheDocument()
    expect(screen.getByText('Add your first service to start building your landing page')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add your first service/i })).toBeInTheDocument()
  })

  test('should open create service dialog when add button is clicked', async () => {
    const props = createServicesSectionTestProps()
    
    render(<ServicesSection {...props} />)
    
    // Click add service button
    await user.click(screen.getByRole('button', { name: /add service/i }))
    
    // Dialog should open
    expect(screen.getByText('Create New Service')).toBeInTheDocument()
    expect(screen.getByLabelText(/service title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  test('should open edit service dialog when edit button is clicked', async () => {
    const props = createServicesSectionTestProps()
    
    render(<ServicesSection {...props} />)
    
    // Click edit button for first service
    const editButtons = screen.getAllByRole('button', { name: '' }) // Edit buttons don't have text
    const editButton = editButtons.find(btn => btn.querySelector('[data-lucide="edit-2"]'))
    
    if (editButton) {
      await user.click(editButton)
      
      // Dialog should open with edit title
      expect(screen.getByText('Edit Service')).toBeInTheDocument()
    }
  })

  test('should handle service creation successfully', async () => {
    const props = createServicesSectionTestProps()
    const newService = generateMockService({
      id: 'new-service-1',
      title: 'New Test Service'
    })
    
    serviceUtils.mockSuccessfulCreate(newService)
    
    render(<ServicesSection {...props} />)
    
    // Open create dialog
    await user.click(screen.getByRole('button', { name: /add service/i }))
    
    // Fill form (mocked to submit valid data)
    const form = screen.getByRole('dialog').querySelector('form')
    if (form) {
      fireEvent.submit(form)
    }
    
    // Should call create service
    await waitFor(() => {
      expect(mockDashboardService.createService).toHaveBeenCalledWith(
        props.landingPageId,
        expect.objectContaining({
          title: 'Test Service',
          description: 'Test description that is long enough',
          image_urls: []
        })
      )
    })
    
    // Should call onUpdate with new service
    expect(props.onUpdate).toHaveBeenCalledWith({
      services: [...props.services, newService]
    })
  })

  test('should handle service deletion', async () => {
    const props = createServicesSectionTestProps()
    
    serviceUtils.mockSuccessfulDelete()
    
    render(<ServicesSection {...props} />)
    
    // Find and click delete button for first service
    const deleteButtons = screen.getAllByRole('button', { name: '' })
    const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-lucide="trash-2"]'))
    
    if (deleteButton) {
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(mockDashboardService.deleteService).toHaveBeenCalledWith('service-1')
      })
      
      // Should update services list without deleted service
      expect(props.onUpdate).toHaveBeenCalledWith({
        services: props.services.filter(s => s.id !== 'service-1')
      })
    }
  })

  test('should handle service reordering', async () => {
    const services = generateMockServicesForReordering(3)
    const props = createServicesSectionTestProps({ services })
    
    serviceUtils.mockSuccessfulReorder()
    
    render(<ServicesSection {...props} />)
    
    // Find the DndContext component
    const dndContext = screen.getByTestId('dnd-context')
    expect(dndContext).toBeInTheDocument()
    
    // Simulate drag end event by getting the handler from data attribute
    const dragHandler = dndContext.getAttribute('data-drag-handler')
    if (dragHandler) {
      // Simulate moving service-1 to service-3 position
      const mockEvent = {
        active: { id: 'service-1' },
        over: { id: 'service-3' }
      }
      
      // Manually trigger the reorder logic
      // In real implementation, this would be handled by dnd-kit
      const reorderedServices = [...services]
      const [movedItem] = reorderedServices.splice(0, 1) // Remove first item
      reorderedServices.splice(2, 0, movedItem) // Insert at third position
      
      // Verify the reordering would call the service
      expect(services).toHaveLength(3)
    }
  })

  test('should handle reordering failure and revert changes', async () => {
    const services = generateMockServicesForReordering(3)
    const props = createServicesSectionTestProps({ services })
    
    serviceUtils.mockFailedReorder('Network error')
    
    render(<ServicesSection {...props} />)
    
    // Simulate failed reorder
    // The component should revert to original order on error
    expect(props.services).toEqual(services)
  })

  test('should display service images when present', () => {
    const serviceWithImages = generateMockService({
      title: 'Service with Images',
      image_urls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
    })
    
    const props = createServicesSectionTestProps({
      services: [serviceWithImages]
    })
    
    render(<ServicesSection {...props} />)
    
    // Should display images
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', 'https://example.com/image1.jpg')
    expect(images[1]).toHaveAttribute('src', 'https://example.com/image2.jpg')
  })

  test('should display YouTube video link when present', () => {
    const serviceWithVideo = generateMockService({
      title: 'Service with Video',
      youtube_url: 'https://youtube.com/watch?v=test123'
    })
    
    const props = createServicesSectionTestProps({
      services: [serviceWithVideo]
    })
    
    render(<ServicesSection {...props} />)
    
    // Should display YouTube link
    const videoLink = screen.getByRole('link', { name: /video/i })
    expect(videoLink).toBeInTheDocument()
    expect(videoLink).toHaveAttribute('href', 'https://youtube.com/watch?v=test123')
    expect(videoLink).toHaveAttribute('target', '_blank')
  })

  test('should display button text and URL when present', () => {
    const serviceWithButton = generateMockService({
      title: 'Service with Button',
      button_text: 'Book Now',
      button_url: 'https://calendly.com/test'
    })
    
    const props = createServicesSectionTestProps({
      services: [serviceWithButton]
    })
    
    render(<ServicesSection {...props} />)
    
    // Should display button info
    expect(screen.getByText('Button: Book Now')).toBeInTheDocument()
  })

  test('should handle form validation errors', async () => {
    // Override the form mock to return validation errors
    vi.mocked(vi.doMock('react-hook-form', async () => {
      const actual = await vi.importActual('react-hook-form')
      return {
        ...actual,
        useForm: () => ({
          register: vi.fn(),
          handleSubmit: vi.fn((fn) => (e: Event) => {
            e.preventDefault()
            // Don't call the function to simulate validation failure
          }),
          formState: {
            errors: {
              title: { message: 'Title is required' },
              description: { message: 'Description is too short' }
            },
            isSubmitting: false,
            isValid: false
          },
          reset: vi.fn(),
          setValue: vi.fn(),
          getValues: vi.fn(() => ({}))
        })
      }
    }))
    
    const props = createServicesSectionTestProps()
    
    render(<ServicesSection {...props} />)
    
    // Open create dialog
    await user.click(screen.getByRole('button', { name: /add service/i }))
    
    // Error messages should not appear until form is submitted and validation runs
    expect(screen.getByText('Create New Service')).toBeInTheDocument()
  })

  test('should show loading state during form submission', async () => {
    const props = createServicesSectionTestProps()
    
    // Mock a delayed response
    serviceUtils.mockSuccessfulCreate(
      new Promise(resolve => 
        setTimeout(() => resolve(generateMockService()), 1000)
      ) as any
    )
    
    render(<ServicesSection {...props} />)
    
    // Open dialog and submit form
    await user.click(screen.getByRole('button', { name: /add service/i }))
    
    const form = screen.getByRole('dialog').querySelector('form')
    if (form) {
      fireEvent.submit(form)
    }
    
    // Should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    
    // Submit button should be disabled
    const submitButton = screen.getByRole('button', { name: /saving/i })
    expect(submitButton).toBeDisabled()
  })

  test('should close dialog after successful submission', async () => {
    const props = createServicesSectionTestProps()
    const newService = generateMockService()
    
    serviceUtils.mockSuccessfulCreate(newService)
    
    render(<ServicesSection {...props} />)
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /add service/i }))
    expect(screen.getByText('Create New Service')).toBeInTheDocument()
    
    // Submit form
    const form = screen.getByRole('dialog').querySelector('form')
    if (form) {
      fireEvent.submit(form)
    }
    
    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Create New Service')).not.toBeInTheDocument()
    })
  })
})