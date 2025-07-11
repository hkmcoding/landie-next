"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Label } from "./label"

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
    const generatedId = React.useId()
    const inputId = id || generatedId

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
          <Label htmlFor={inputId} className="label">{label}</Label>
        )}
        
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
        
        
        {error && (
          <p className="text-error">{error}</p>
        )}
        
        {!error && !selectedFile && (
          <p className="text-description caption-sm">{/* was text-xs */}
            PNG, JPG, GIF up to {maxSize}MB
          </p>
        )}
      </div>
    )
  }
)

FileUpload.displayName = "FileUpload"

export { FileUpload } 