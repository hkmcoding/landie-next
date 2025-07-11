"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Edit2, Trash2, Save, Loader2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Highlight, DashboardData } from "@/types/dashboard"
import { DashboardServiceClient } from "@/lib/supabase/dashboard-service-client"

const highlightSchema = z.object({
  header: z.string().min(3, "Header must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
})

type HighlightFormData = z.infer<typeof highlightSchema>

interface HighlightsSectionProps {
  highlights: Highlight[]
  landingPageId?: string
  onUpdate: (data: Partial<DashboardData>) => void
}

export function HighlightsSection({ highlights, landingPageId, onUpdate }: HighlightsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const dashboardService = new DashboardServiceClient()

  const form = useForm<HighlightFormData>({
    resolver: zodResolver(highlightSchema),
    defaultValues: {
      header: "",
      content: "",
    },
  })

  const handleCreateHighlight = () => {
    setEditingHighlight(null)
    form.reset()
    setIsDialogOpen(true)
  }

  const handleEditHighlight = (highlight: Highlight) => {
    setEditingHighlight(highlight)
    form.reset({
      header: highlight.header,
      content: highlight.content || "",
    })
    setIsDialogOpen(true)
  }

  const handleDeleteHighlight = async (highlightId: string) => {
    try {
      await dashboardService.deleteHighlight(highlightId)
      const updatedHighlights = highlights.filter(h => h.id !== highlightId)
      onUpdate({ highlights: updatedHighlights })
    } catch (error) {
      console.error('Error deleting highlight:', error)
    }
  }

  const onSubmit = async (data: HighlightFormData) => {
    if (!landingPageId) return

    try {
      setIsLoading(true)
      
      if (editingHighlight) {
        const updatedHighlight = await dashboardService.updateHighlight(editingHighlight.id, data)
        if (updatedHighlight) {
          const updatedHighlights = highlights.map(h => 
            h.id === editingHighlight.id ? updatedHighlight : h
          )
          onUpdate({ highlights: updatedHighlights })
        }
      } else {
        const newHighlight = await dashboardService.createHighlight(landingPageId, data)
        if (newHighlight) {
          onUpdate({ highlights: [...highlights, newHighlight] })
        }
      }
      
      setIsDialogOpen(false)
      form.reset()
    } catch (error) {
      console.error('Error saving highlight:', error)
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
            <h1 className="heading-5 lg:heading-4 font-bold">Highlights</h1>
            <p className="text-description lg:paragraph">
              Showcase your key features and achievements
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateHighlight} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Highlight
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingHighlight ? 'Edit Highlight' : 'Create New Highlight'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 lg:space-y-6">
              <FormField
                label="Header"
                placeholder="Key Achievement"
                {...form.register("header")}
                error={form.formState.errors.header?.message}
              />

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  {...form.register("content")}
                  placeholder="Describe this highlight..."
                  rows={3}
                  className="min-h-[80px]"
                />
                {form.formState.errors.content && (
                  <p className="text-error">
                    {form.formState.errors.content.message}
                  </p>
                )}
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
                      {editingHighlight ? 'Update Highlight' : 'Create Highlight'}
                    </>
                  )}
                </Button>
              </div>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {highlights.map((highlight) => (
          <Card key={highlight.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="subtitle-3">{highlight.header}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditHighlight(highlight)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteHighlight(highlight.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-description">
                {highlight.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {highlights.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-muted-foreground">
              <Star className="mx-auto h-12 w-12 mb-4" />
              <h3 className="subtitle-3 font-semibold mb-2">No highlights yet</h3>
              <p className="paragraph mb-4">
                Add highlights to showcase your achievements
              </p>
              <Button onClick={handleCreateHighlight} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Highlight
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}