"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Upload } from "lucide-react"

interface MultiFileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilesChange?: (files: FileList | null) => void
  maxFiles?: number
  acceptedTypes?: string
  maxFileSize?: number // in MB
}

const MultiFileInput = React.forwardRef<HTMLInputElement, MultiFileInputProps>(
  ({ className, onFilesChange, maxFiles = 5, acceptedTypes = "image/*", maxFileSize = 5, ...props }, ref) => {
    const [dragActive, setDragActive] = React.useState(false)
    const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleDrag = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true)
      } else if (e.type === "dragleave") {
        setDragActive(false)
      }
    }, [])

    const handleDrop = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const files = Array.from(e.dataTransfer.files)
        const imageFiles = files.filter(file => file.type.startsWith('image/'))
        
        if (imageFiles.length + selectedFiles.length > maxFiles) {
          alert(`You can only upload up to ${maxFiles} images`)
          return
        }
        
        const validFiles = imageFiles.filter(file => file.size <= maxFileSize * 1024 * 1024)
        if (validFiles.length !== imageFiles.length) {
          alert(`Some files were too large. Maximum file size is ${maxFileSize}MB`)
        }
        
        setSelectedFiles(prev => [...prev, ...validFiles])
        onFilesChange?.(e.dataTransfer.files)
      }
    }, [selectedFiles, maxFiles, maxFileSize, onFilesChange])

    const handleFileSelect = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const files = Array.from(e.target.files)
        const imageFiles = files.filter(file => file.type.startsWith('image/'))
        
        if (imageFiles.length + selectedFiles.length > maxFiles) {
          alert(`You can only upload up to ${maxFiles} images`)
          return
        }
        
        const validFiles = imageFiles.filter(file => file.size <= maxFileSize * 1024 * 1024)
        if (validFiles.length !== imageFiles.length) {
          alert(`Some files were too large. Maximum file size is ${maxFileSize}MB`)
        }
        
        setSelectedFiles(prev => [...prev, ...validFiles])
        onFilesChange?.(e.target.files)
      }
    }, [selectedFiles, maxFiles, maxFileSize, onFilesChange])

    const removeFile = (index: number) => {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }

    return (
      <div className="space-y-4">
        <div
          className={cn(
            "relative flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed rounded-lg transition-colors cursor-pointer",
            dragActive 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            className
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={acceptedTypes}
            onChange={handleFileSelect}
            className="hidden"
            {...props}
          />
          
          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
            <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, GIF up to {maxFileSize}MB (max {maxFiles} files)
            </p>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Selected Files ({selectedFiles.length}/{maxFiles})</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-20 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  <p className="text-xs text-muted-foreground truncate mt-1">{file.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
)

MultiFileInput.displayName = "MultiFileInput"

export { MultiFileInput } 