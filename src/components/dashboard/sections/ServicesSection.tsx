"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Edit2, Trash2, Save, Loader2, Youtube, Briefcase, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { MultiFileInput } from "@/components/ui/multi-file-input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Service, DashboardData, CreateServiceInput } from "@/types/dashboard"
import { DashboardServiceClient } from "@/lib/supabase/dashboard-service-client"
import { createClient } from "@/lib/supabase/client"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import Image from 'next/image';
import { ImageFallback } from '@/components/ui/ImageFallback';

const serviceSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.string().optional(),
  button_text: z.string().min(3, "Button text must be at least 3 characters"),
  button_url: z.string().url("Must be a valid URL"),
  youtube_url: z.string().url().optional().or(z.literal("")),
})

type ServiceFormData = z.infer<typeof serviceSchema>

interface ServicesSectionProps {
  services: Service[]
  landingPageId?: string
  onUpdate: (data: Partial<DashboardData>) => void
}

interface SortableServiceCardProps {
  service: Service
  onEdit: (service: Service) => void
  onDelete: (service: Service) => void
}

function SortableServiceCard({ service, onEdit, onDelete }: SortableServiceCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "opacity-50" : ""}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-grab active:cursor-grabbing p-1"
                    {...attributes}
                    {...listeners}
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <p>Drag to reorder</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div>
              <CardTitle className="subtitle-3">{service.title}</CardTitle>
              {service.price && (
                <p className="text-description">{service.price}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(service)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(service)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="paragraph mb-4">
          {service.description}
        </p>
        
        {service.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {service.image_urls.map((imageUrl, index) => (
              imageUrl ? (
                <Image
                  key={index}
                  src={imageUrl}
                  alt={`${service.title} image ${index + 1}`}
                  width={64}
                  height={64}
                  loading="lazy"
                  className="rounded-md"
                />
              ) : (
                <ImageFallback key={index} size={64} rounded="md" />
              )
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-description">
          {service.button_text && service.button_url && (
            <span>Button: {service.button_text}</span>
          )}
          {service.youtube_url && (
            <a
              href={service.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Youtube className="h-4 w-4" />
              Video
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ServicesSection({ services, landingPageId, onUpdate }: ServicesSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const supabase = createClient()
  const dashboardService = new DashboardServiceClient()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = services.findIndex((item) => item.id === active.id)
      const newIndex = services.findIndex((item) => item.id === over?.id)

      const newServices = [...services]
      const [reorderedItem] = newServices.splice(oldIndex, 1)
      newServices.splice(newIndex, 0, reorderedItem)

      // Update local state immediately
      onUpdate({ services: newServices })

      // Persist to database
      try {
        await dashboardService.updateServicesOrder(newServices)
      } catch (error) {
        console.error('Error updating services order:', error)
        // Revert on error
        onUpdate({ services })
      }
    }
  }

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      button_text: "Learn More",
      button_url: "",
      youtube_url: "",
    },
  })

  const handleCreateService = () => {
    setEditingService(null)
    form.reset()
    setIsDialogOpen(true)
  }

  const handleEditService = (service: Service) => {
    setEditingService(service)
    form.reset({
      title: service.title || "",
      description: service.description || "",
      price: service.price || "",
      button_text: service.button_text || "Learn More",
      button_url: service.button_url || "",
      youtube_url: service.youtube_url || "",
    })
    setIsDialogOpen(true)
  }

  const handleDeleteService = async (service: Service) => {
    setServiceToDelete(service)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return
    
    try {
      setIsDeleting(true)
      await dashboardService.deleteService(serviceToDelete.id)
      const updatedServices = services.filter(s => s.id !== serviceToDelete.id)
      onUpdate({ services: updatedServices })
      setIsDeleteModalOpen(false)
      setServiceToDelete(null)
    } catch (error) {
      console.error('Error deleting service:', error)
    } finally {
      setIsDeleting(false)
    }
  }


  const onSubmit = async (data: ServiceFormData) => {
    if (!landingPageId) return

    try {
      setIsLoading(true)
      
      if (editingService) {
        const updatedService = await dashboardService.updateService(editingService.id, data)
        if (updatedService) {
          const updatedServices = services.map(s => 
            s.id === editingService.id ? updatedService : s
          )
          onUpdate({ services: updatedServices })
        }
      } else {
        const createData: CreateServiceInput = {
          ...data,
          image_urls: [],
        }
        const newService = await dashboardService.createService(landingPageId, createData)
        if (newService) {
          onUpdate({ services: [...services, newService] })
        }
      }
      
      setIsDialogOpen(false)
      form.reset()
    } catch (error) {
      console.error('Error saving service:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 lg:top-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-4 border-b lg:border-b-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="heading-5 lg:heading-4 font-bold">Services</h1>
            <p className="text-description lg:paragraph">
              Manage your services and offerings
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateService} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingService ? 'Edit Service' : 'Create New Service'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 lg:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Service Title"
                  placeholder="1-on-1 Personal Training"
                  {...form.register("title")}
                  error={form.formState.errors.title?.message}
                />
                <FormField
                  label="Price (optional)"
                  placeholder="$85/session"
                  {...form.register("price")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Personalized fitness program designed to help you reach your specific goals through targeted exercises, nutrition guidance, and ongoing support..."
                  rows={3}
                />
                {form.formState.errors.description && (
                  <p className="text-error">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Button Text"
                  placeholder="Start Training"
                  {...form.register("button_text")}
                  error={form.formState.errors.button_text?.message}
                />
                <FormField
                  label="Button URL"
                  placeholder="https://calendly.com/sarahfitness/consultation"
                  {...form.register("button_url")}
                  error={form.formState.errors.button_url?.message}
                />
              </div>

              <FormField
                label="YouTube Video URL (optional)"
                placeholder="https://youtube.com/watch?v=..."
                {...form.register("youtube_url")}
              />

              <div className="space-y-2">
                <Label>Service Images</Label>
                <MultiFileInput
                  maxFiles={5}
                  acceptedTypes="image/*"
                  maxFileSize={5}
                  existingImages={editingService?.image_urls || []}
                  onRemoveExistingImage={async (index) => {
                    if (!editingService) return;
                    
                    const updatedImageUrls = editingService.image_urls.filter((_, i) => i !== index);
                    const updatedService = await dashboardService.updateService(editingService.id, {
                      image_urls: updatedImageUrls
                    });
                    if (updatedService) {
                      const updatedServices = services.map(s => 
                        s.id === editingService.id ? updatedService : s
                      );
                      onUpdate({ services: updatedServices });
                      setEditingService(updatedService);
                    }
                  }}
                  onFilesChange={async (files) => {
                    if (!files || files.length === 0) return;
                    
                    try {
                      setIsLoading(true);
                      
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error('No user found');

                      const uploadPromises = Array.from(files).map(async (file) => {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${user.id}/${editingService?.id || 'new'}-${Date.now()}.${fileExt}`;
                        return dashboardService.uploadImage('service-images', fileName, file);
                      });

                      const imageUrls = await Promise.all(uploadPromises);
                      
                      if (editingService) {
                        const updatedImageUrls = [...(editingService.image_urls || []), ...imageUrls];
                        const updatedService = await dashboardService.updateService(editingService.id, {
                          image_urls: updatedImageUrls
                        });
                        
                        if (updatedService) {
                          const updatedServices = services.map(s => 
                            s.id === editingService.id ? updatedService : s
                          );
                          onUpdate({ services: updatedServices });
                          setEditingService(updatedService);
                        }
                      }
                    } catch (error) {
                      console.error('Error uploading images:', error);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {editingService ? 'Update Service' : 'Create Service'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={services.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {services.map((service) => (
              <SortableServiceCard
                key={service.id}
                service={service}
                onEdit={handleEditService}
                onDelete={handleDeleteService}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {services.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-muted-foreground">
              <Briefcase className="mx-auto h-12 w-12 mb-4" />
              <h3 className="subtitle-3 font-semibold mb-2">No services yet</h3>
              <p className="paragraph mb-4">
                Add your first service to start building your landing page
              </p>
              <Button onClick={handleCreateService}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteService}
        title="Delete Service"
        description={`Are you sure you want to delete "${serviceToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Service"
        isLoading={isDeleting}
      />
    </div>
  )
}