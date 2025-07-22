"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CreditCard, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { LandingPage, DashboardData } from "@/types/dashboard"
import { DashboardServiceClient } from "@/lib/supabase/dashboard-service-client"
import { createClient } from "@/lib/supabase/client"

const ctaSchema = z.object({
  cta_text: z.string().min(3, "CTA text must be at least 3 characters"),
  cta_url: z.string().url("Must be a valid URL"),
})

type CTAFormData = z.infer<typeof ctaSchema>

interface CallToActionSectionProps {
  landingPage: LandingPage | null
  onUpdate: (data: Partial<DashboardData>) => void
}

export function CallToActionSection({ landingPage, onUpdate }: CallToActionSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const supabase = createClient()
  const dashboardService = new DashboardServiceClient()

  const form = useForm<CTAFormData>({
    resolver: zodResolver(ctaSchema),
    defaultValues: {
      cta_text: "",
      cta_url: "",
    },
  })

  // Update form when landingPage data changes
  useEffect(() => {
    if (landingPage) {
      form.reset({
        cta_text: landingPage.cta_text || "",
        cta_url: landingPage.cta_url || "",
      })
    }
  }, [landingPage, form])

  const onSubmit = async (data: CTAFormData) => {
    try {
      setIsLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const updatedLandingPage = await dashboardService.updateLandingPage(user.id, data)
      
      if (updatedLandingPage) {
        onUpdate({ landingPage: updatedLandingPage })
        // TODO: Add success toast
      }
    } catch (error) {
      console.error('Error updating CTA:', error)
      // TODO: Add error toast
    } finally {
      setIsLoading(false)
    }
  }

  const ctaExamples = [
    { text: "Book a Free Consultation", url: "https://calendly.com/your-link" },
    { text: "Start Your Journey Today", url: "https://your-booking-system.com" },
    { text: "Get Started Now", url: "https://your-signup-page.com" },
    { text: "Schedule a Call", url: "https://your-scheduling-tool.com" },
    { text: "Join the Program", url: "https://your-enrollment-page.com" },
  ]

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 lg:top-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-4 border-b lg:border-b-0">
        <h1 className="heading-5 lg:heading-4 font-bold">Call to Action</h1>
        <p className="text-description lg:paragraph">
          Create a compelling call-to-action button for your landing page
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Primary CTA Button</CardTitle>
          <CardDescription>
            This is the main action you want visitors to take on your landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 lg:space-y-6">
            <FormField
              label="Button Text"
              placeholder="Book a Free Consultation"
              {...form.register("cta_text")}
              error={form.formState.errors.cta_text?.message}
            />

            <FormField
              label="Button URL"
              placeholder="https://calendly.com/your-link"
              {...form.register("cta_url")}
              error={form.formState.errors.cta_url?.message}
            />

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full sm:w-auto min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save CTA
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your CTA button will appear on your landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6 lg:py-8">
            {form.watch("cta_text") && form.watch("cta_url") ? (
              <div className="flex flex-col items-center gap-5">
                <Button size="lg" className="px-6 py-3 lg:px-8">
                  <CreditCard className="mr-2 h-5 w-5" />
                  {form.watch("cta_text")}
                </Button>
                <p className="text-description mt-2 break-all text-center">
                  Links to: {form.watch("cta_url")}
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p className="paragraph">
                  Fill in the button text and URL above to see the preview
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips for Effective CTAs</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-description">
            <li>• Use action-oriented language (Book, Start, Get, Join)</li>
            <li>• Create urgency when appropriate (Today, Now, Free)</li>
            <li>• Be specific about what happens next (Free Consultation, 30-min Call)</li>
            <li>• Make sure your URL works and leads to the right page</li>
            <li>• Test different versions to see what works best</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CTA Examples</CardTitle>
          <CardDescription>
            Click on any example to use it as a starting point
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ctaExamples.map((example, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  form.setValue("cta_text", example.text)
                  form.setValue("cta_url", example.url)
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{example.text}</p>
                  <p className="caption-sm text-muted-foreground truncate">{example.url}</p>
                </div>
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  Use This
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}