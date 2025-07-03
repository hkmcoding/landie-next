import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MultiFileInput } from "@/components/ui/multi-file-input";
import { FormField } from "@/components/ui/form-field";
import { FileUpload } from "@/components/ui/file-upload";
import { TextInput } from "@/components/ui/text-input";

export default function ComponentsPage() {
  // Only show when SHOW_COMPONENTS is set to 'true'
  if (process.env.SHOW_COMPONENTS !== 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold">Page Not Found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">shadcn/ui Test Page</h1>
          <p className="text-muted-foreground">Testing shadcn/ui components in Next.js App Router</p>
        </div>

        {/* Color Scheme Test */}
        <Card>
          <CardHeader>
            <CardTitle>Color Scheme</CardTitle>
            <CardDescription>Testing the default shadcn/ui color scheme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-primary text-primary-foreground rounded-md">
                Primary
              </div>
              <div className="p-4 bg-secondary text-secondary-foreground rounded-md">
                Secondary
              </div>
              <div className="p-4 bg-muted text-muted-foreground rounded-md">
                Muted
              </div>
              <div className="p-4 bg-accent text-accent-foreground rounded-md">
                Accent
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Button Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Button Components</CardTitle>
            <CardDescription>Testing different button variants and sizes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button>Default Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button loading loadingText="Loading...">
                Loading...
              </Button>
              <Button variant="secondary" loading loadingText="Processing">
                Processing
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements Test */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Testing input and textarea components with different types and states</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Standard Text Inputs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Standard Text Inputs</h3>
              <TextInput
                label="Name"
                placeholder="Enter your full name"
              />
              <TextInput
                label="Headline"
                placeholder="e.g., Senior Software Engineer"
                tooltip="This will be displayed prominently on your profile"
              />
              <TextInput
                label="Subheadline"
                placeholder="e.g., Building amazing user experiences"
                description="A brief description that appears below your headline"
              />
            </div>

            {/* Username States */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Username Input States</h3>
              <FormField
                label="Username (Default)"
                placeholder="Enter your username"
              />
              <FormField
                label="Username (Valid)"
                defaultValue="john_doe"
                success="✓ Username is available"
              />
              <FormField
                label="Username (Taken)"
                defaultValue="admin"
                error="✗ Username is already taken"
              />
            </div>

            {/* Other Form Elements */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Other Input Types</h3>
              <FormField
                label="Email (Default)"
                type="email"
                placeholder="Enter your email"
              />
              <FormField
                label="Email (Invalid)"
                type="email"
                defaultValue="invalid-email"
                error="Please enter a valid email address"
              />
              <FormField
                label="Password (Default)"
                type="password"
                placeholder="Enter your password"
              />
              <FormField
                label="Password (Too Short)"
                type="password"
                defaultValue="123"
                error="Password must be at least 8 characters"
              />
              <FormField
                label="Password (Weak)"
                type="password"
                defaultValue="password123"
                warning="Consider adding uppercase, numbers, or symbols"
              />
              <FormField
                label="Password (Strong)"
                type="password"
                defaultValue="SecurePass123!"
                success="✓ Strong password"
              />
              <FormField
                label="Confirm Password (Default)"
                type="password"
                placeholder="Confirm your password"
              />
              <FormField
                label="Confirm Password (Mismatch)"
                type="password"
                defaultValue="different"
                error="Passwords do not match"
              />
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Enter your message" />
              </div>
              <FileUpload
                label="Profile Picture Upload"
                maxSize={5}
              />
              <FileUpload
                label="Profile Picture (Large File)"
                maxSize={5}
                error="File size must be less than 5MB"
              />
              <FileUpload
                label="Profile Picture (Invalid Format)"
                maxSize={5}
                error="Please upload a valid image file (JPG, PNG, GIF)"
              />
              <div className="space-y-2">
                <Label>Multiple Images Upload</Label>
                <MultiFileInput maxFiles={5} maxFileSize={5} />
              </div>
            </div>
            
            <Button type="submit">Submit Form</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 