"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Edit2, Trash2, Save, Loader2, MessageSquare, Youtube } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { MultiFileInput } from "@/components/ui/multi-file-input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Testimonial, DashboardData, CreateTestimonialInput } from "@/types/dashboard"
import { DashboardServiceClient } from "@/lib/supabase/dashboard-service-client"
import { createClient } from "@/lib/supabase/client"

const testimonialSchema = z.object({
  quote: z.string().min(10, "Quote must be at least 10 characters"),
  author_name: z.string().min(2, "Author name must be at least 2 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  youtube_url: z.string().url().optional().or(z.literal("")),
})

type TestimonialFormData = z.infer<typeof testimonialSchema>

interface TestimonialsSectionProps {
  testimonials: Testimonial[]
  landingPageId?: string
  onUpdate: (data: Partial<DashboardData>) => void
}

export function TestimonialsSection({ testimonials, landingPageId, onUpdate }: TestimonialsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const supabase = createClient()
  const dashboardService = new DashboardServiceClient()

  const form = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      quote: "",
      author_name: "",
      description: "",
      youtube_url: "",
    },
  })

  const handleCreateTestimonial = () => {
    setEditingTestimonial(null)
    form.reset()
    setIsDialogOpen(true)
  }

  const handleEditTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial)
    form.reset({
      quote: testimonial.quote || "",
      author_name: testimonial.author_name || "",
      description: testimonial.description || "",
      youtube_url: testimonial.youtube_url || "",
    })
    setIsDialogOpen(true)
  }

  const handleDeleteTestimonial = async (testimonialId: string) => {
    try {
      await dashboardService.deleteTestimonial(testimonialId)
      const updatedTestimonials = testimonials.filter(t => t.id !== testimonialId)
      onUpdate({ testimonials: updatedTestimonials })
    } catch (error) {
      console.error('Error deleting testimonial:', error)
    }
  }


  const onSubmit = async (data: TestimonialFormData) => {
    if (!landingPageId) return

    try {
      setIsLoading(true)
      
      if (editingTestimonial) {
        const updatedTestimonial = await dashboardService.updateTestimonial(editingTestimonial.id, data)
        if (updatedTestimonial) {
          const updatedTestimonials = testimonials.map(t => 
            t.id === editingTestimonial.id ? updatedTestimonial : t
          )
          onUpdate({ testimonials: updatedTestimonials })
        }
      } else {
        const createData: CreateTestimonialInput = {
          ...data,
          image_urls: [],
        }
        const newTestimonial = await dashboardService.createTestimonial(landingPageId, createData)
        if (newTestimonial) {
          onUpdate({ testimonials: [...testimonials, newTestimonial] })
        }
      }
      
      setIsDialogOpen(false)
      form.reset()
    } catch (error) {
      console.error('Error saving testimonial:', error)
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
            <h1 className="heading-5 lg:heading-4 font-bold">Testimonials</h1>
            <p className="text-description lg:paragraph">
              Share client success stories and feedback
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateTestimonial} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Testimonial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTestimonial ? 'Edit Testimonial' : 'Create New Testimonial'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 lg:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="quote">Quote</Label>
                <Textarea
                  id="quote"
                  {...form.register("quote")}
                  placeholder="This service changed my life..."
                  rows={3}
                  className="min-h-[80px]"
                />
                {form.formState.errors.quote && (
                  <p className="text-error">
                    {form.formState.errors.quote.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Author Name"
                  placeholder="John Doe"
                  {...form.register("author_name")}
                  error={form.formState.errors.author_name?.message}
                />
                <FormField
                  label="Description/Title"
                  placeholder="CEO, Company Name"
                  {...form.register("description")}
                  error={form.formState.errors.description?.message}
                />
              </div>

              <FormField
                label="YouTube Video URL (optional)"
                placeholder="https://youtube.com/watch?v=..."
                {...form.register("youtube_url")}
              />

              <div className="space-y-2">
                <Label>Testimonial Images</Label>
                <MultiFileInput
                  maxFiles={5}
                  acceptedTypes="image/*"
                  maxFileSize={5}
                  existingImages={editingTestimonial?.image_urls || []}
                  onRemoveExistingImage={async (index) => {
                    if (!editingTestimonial) return;
                    
                    const updatedImageUrls = editingTestimonial.image_urls.filter((_, i) => i !== index);
                    const updatedTestimonial = await dashboardService.updateTestimonial(editingTestimonial.id, {
                      image_urls: updatedImageUrls
                    });
                    if (updatedTestimonial) {
                      const updatedTestimonials = testimonials.map(t => 
                        t.id === editingTestimonial.id ? updatedTestimonial : t
                      );
                      onUpdate({ testimonials: updatedTestimonials });
                      setEditingTestimonial(updatedTestimonial);
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
                        const fileName = `${user.id}/${editingTestimonial?.id || 'new'}-${Date.now()}.${fileExt}`;
                        return dashboardService.uploadImage('testimonial-images', fileName, file);
                      });

                      const imageUrls = await Promise.all(uploadPromises);
                      
                      if (editingTestimonial) {
                        const updatedImageUrls = [...(editingTestimonial.image_urls || []), ...imageUrls];
                        const updatedTestimonial = await dashboardService.updateTestimonial(editingTestimonial.id, {
                          image_urls: updatedImageUrls
                        });
                        
                        if (updatedTestimonial) {
                          const updatedTestimonials = testimonials.map(t => 
                            t.id === editingTestimonial.id ? updatedTestimonial : t
                          );
                          onUpdate({ testimonials: updatedTestimonials });
                          setEditingTestimonial(updatedTestimonial);
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
                      {editingTestimonial ? 'Update Testimonial' : 'Create Testimonial'}
                    </>
                  )}
                </Button>
              </div>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="subtitle-3">{testimonial.author_name}</CardTitle>
                  <p className="text-description">{testimonial.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditTestimonial(testimonial)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTestimonial(testimonial.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <blockquote className="caption italic mb-4 border-l-4 border-muted pl-4">
                "{testimonial.quote}"
              </blockquote>
              
              {testimonial.image_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {testimonial.image_urls.map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`${testimonial.author_name} image ${index + 1}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ))}
                </div>
              )}

              {testimonial.youtube_url && (
                <div className="flex items-center gap-2">
                  <a
                    href={testimonial.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-description hover:text-foreground"
                  >
                    <Youtube className="h-4 w-4" />
                    Video
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {testimonials.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-4" />
              <h3 className="subtitle-3 font-semibold mb-2">No testimonials yet</h3>
              <p className="paragraph mb-4">
                Add client testimonials to build trust and credibility
              </p>
              <div className="flex justify-center">
                <Button onClick={handleCreateTestimonial} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Testimonial
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}