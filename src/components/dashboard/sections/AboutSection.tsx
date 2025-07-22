"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LandingPage, DashboardData } from "@/types/dashboard"
import { DashboardServiceClient } from "@/lib/supabase/dashboard-service-client"
import { createClient } from "@/lib/supabase/client"

const aboutSchema = z.object({
  bio: z.string().min(50, "Bio must be at least 50 characters"),
})

type AboutFormData = z.infer<typeof aboutSchema>

interface AboutSectionProps {
  landingPage: LandingPage | null
  onUpdate: (data: Partial<DashboardData>) => void
}

export function AboutSection({ landingPage, onUpdate }: AboutSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const supabase = createClient()
  const dashboardService = new DashboardServiceClient()

  // Debug logs to track bio field issue
  console.log('AboutSection - landingPage received:', landingPage)
  console.log('AboutSection - landingPage.bio:', landingPage?.bio)
  console.log('AboutSection - landingPage keys:', landingPage ? Object.keys(landingPage) : 'landingPage is null')

  const form = useForm<AboutFormData>({
    resolver: zodResolver(aboutSchema),
    defaultValues: {
      bio: landingPage?.bio || "",
    },
  })

  const onSubmit = async (data: AboutFormData) => {
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
      console.error('Error updating bio:', error)
      // TODO: Add error toast
    } finally {
      setIsLoading(false)
    }
  }

  const bioExamples = [
    {
      title: "Personal Trainer",
      content: "I'm a certified personal trainer with over 8 years of experience helping busy professionals transform their health and fitness. My approach combines evidence-based training methods with sustainable lifestyle changes.\n\nI specialize in:\n• Strength training and muscle building\n• Weight loss and body composition\n• Functional movement and injury prevention\n• Nutrition coaching and meal planning\n\nWhen I'm not in the gym, I love hiking, cooking healthy meals, and spending time with my family. I believe that fitness should enhance your life, not complicate it."
    },
    {
      title: "Business Coach",
      content: "As a business strategist and coach, I've helped over 200 entrepreneurs build profitable, sustainable businesses. My background in corporate strategy and entrepreneurship gives me unique insights into what actually works in today's market.\n\nI work with:\n• Early-stage entrepreneurs looking to validate their ideas\n• Established business owners ready to scale\n• Teams needing strategic direction and accountability\n• Anyone wanting to build systems that work without them\n\nMy mission is to help you build a business that serves your life, not the other way around."
    },
    {
      title: "Life Coach",
      content: "I'm passionate about helping people discover their authentic selves and create lives they truly love. Through my work as a certified life coach, I've supported hundreds of clients in making meaningful changes.\n\nMy specialties include:\n• Career transitions and purpose discovery\n• Relationship and communication skills\n• Confidence and self-worth development\n• Goal setting and accountability\n\nI believe everyone has the potential to create positive change in their life. Sometimes we just need the right support and tools to get there."
    }
  ]

  const insertExample = (content: string) => {
    form.setValue("bio", content)
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 lg:top-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-4 border-b lg:border-b-0">
        <h1 className="heading-5 lg:heading-4 font-bold">About/Bio</h1>
        <p className="text-description lg:paragraph">
          Tell your story and connect with your audience
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Story</CardTitle>
          <CardDescription>
            Share your background, expertise, and what makes you unique. This will appear in the about section of your landing page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio Content</Label>
              <Textarea
                id="bio"
                {...form.register("bio")}
                placeholder="Tell your story... Share your background, expertise, and what drives you. What makes you unique? What's your mission?"
                rows={12}
                className="resize-none"
              />
              {form.formState.errors.bio && (
                <p className="text-error">
                  {form.formState.errors.bio.message}
                </p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-description">
                  {form.watch("bio")?.length || 0} characters (minimum 50)
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue("bio", "")}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

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
                    Save Bio
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {form.watch("bio") && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              See how your bio will appear on your landing page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-6 rounded-lg">
              <div className="prose prose-sm max-w-none">
                <p className="paragraph whitespace-pre-line">
                  {form.watch("bio")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Writing Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">What to Include</h4>
              <ul className="space-y-1 text-description">
                <li>• Your professional background and experience</li>
                <li>• What you specialize in or are passionate about</li>
                <li>• Your unique approach or methodology</li>
                <li>• Personal touches that make you relatable</li>
                <li>• Your mission or what drives you</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Writing Style</h4>
              <ul className="space-y-1 text-description">
                <li>• Write in first person ("I" statements)</li>
                <li>• Use a conversational, authentic tone</li>
                <li>• Break up text with bullet points or short paragraphs</li>
                <li>• Focus on how you help your clients</li>
                <li>• End with your mission or values</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bio Examples</CardTitle>
          <CardDescription>
            Click on any example to use it as a starting point for your own bio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bioExamples.map((example, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => insertExample(example.content)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{example.title}</h4>
                  <Button variant="ghost" size="sm">
                    Use This
                  </Button>
                </div>
                <p className="text-description whitespace-pre-line">
                  {example.content.substring(0, 150)}...
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}