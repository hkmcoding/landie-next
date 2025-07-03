"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Label } from "./label"
import { Upload, X } from "lucide-react"

/**
 * FileUpload component for single file uploads with preview and validation.
 * Perfect for profile pictures, document uploads, etc.
 * 
 * @example
 * ```tsx
 * <FileUpload
 *   label="Profile Picture"
 *   maxSize={5}
 *   onFileChange={(file) => console.log('Selected file:', file)}
 * />
 * 
 * <FileUpload
 *   label="Profile Picture (Large File)"
 *   maxSize={5}
 *   error="File size must be less than 5MB"
 * />
 * 
 * <FileUpload
 *   label="Document Upload"
 *   acceptedTypes=".pdf,.doc,.docx"
 *   maxSize={10}
 *   showPreview={false}
 * />
 * ```
 */
interface FileUploadProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Label text displayed above the input */
  label?: string
  /** Error message displayed below the input */
  error?: string
  /** Callback function called when file selection changes */
  onFileChange?: (file: File | null) => void
  /** Maximum file size in MB (default: 5) */
  maxSize?: number
  /** Accepted file types (default: "image/*") */
  acceptedTypes?: string
  /** Whether to show image preview (default: true) */
  showPreview?: boolean
}

const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ 
    className, 
    label, 
    error, 
    onFileChange, 
    maxSize = 5, 
    acceptedTypes = "image/*",
    showPreview = true,
    id,
    ...props 
  }, ref) => {
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
    const inputId = id || React.useId()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null
      
      if (file) {
        // Validate file size
        if (file.size > maxSize * 1024 * 1024) {
          onFileChange?.(null)
          return
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          onFileChange?.(null)
          return
        }
        
        setSelectedFile(file)
        onFileChange?.(file)
        
        // Create preview URL
        if (showPreview) {
          const url = URL.createObjectURL(file)
          setPreviewUrl(url)
        }
      } else {
        setSelectedFile(null)
        setPreviewUrl(null)
        onFileChange?.(null)
      }
    }

    const removeFile = () => {
      setSelectedFile(null)
      setPreviewUrl(null)
      onFileChange?.(null)
      // Reset input
      const input = document.getElementById(inputId) as HTMLInputElement
      if (input) input.value = ''
    }

    React.useEffect(() => {
      return () => {
        // Cleanup preview URL on unmount
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }
      }
    }, [previewUrl])

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId}>{label}</Label>
        )}
        
        {!selectedFile ? (
          <Input
            ref={ref}
            id={inputId}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileChange}
            className={cn(
              "file:text-foreground placeholder:text-muted-foreground",
              "cursor-pointer",
              error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50",
              className
            )}
            {...props}
          />
        ) : (
          <div className="relative">
            {showPreview && previewUrl && (
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt={selectedFile.name}
                  className="w-20 h-20 object-cover rounded-md border"
                />
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">{selectedFile.name}</p>
          </div>
        )}
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        
        {!error && !selectedFile && (
          <p className="text-xs text-muted-foreground">
            PNG, JPG, GIF up to {maxSize}MB
          </p>
        )}
      </div>
    )
  }
)

FileUpload.displayName = "FileUpload"

export { FileUpload } 