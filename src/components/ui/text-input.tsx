"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Label } from "./label"
import { HelpCircle } from "lucide-react"

/**
 * TextInput component for basic text fields like Name, Headline, Subheadline, etc.
 * 
 * @example
 * ```tsx
 * <TextInput
 *   label="Name"
 *   placeholder="Enter your full name"
 * />
 * 
 * <TextInput
 *   label="Headline"
 *   placeholder="e.g., Senior Software Engineer"
 *   tooltip="This will be displayed prominently on your profile"
 * />
 * 
 * <TextInput
 *   label="Subheadline"
 *   placeholder="e.g., Building amazing user experiences"
 *   description="A brief description that appears below your headline"
 * />
 * ```
 */
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string
  /** Tooltip text that appears on hover (shows help icon) */
  tooltip?: string
  /** Description text displayed below the input */
  description?: string
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, label, tooltip, description, id, ...props }, ref) => {
    const inputId = id || React.useId()
    const [showTooltip, setShowTooltip] = React.useState(false)
    
    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center gap-2">
            <Label htmlFor={inputId}>{label}</Label>
            {tooltip && (
              <div className="relative">
                <HelpCircle 
                  className="w-4 h-4 text-muted-foreground cursor-help"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                />
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md shadow-md border z-50 whitespace-nowrap">
                    {tooltip}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <Input
          ref={ref}
          id={inputId}
          className={className}
          {...props}
        />
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    )
  }
)

TextInput.displayName = "TextInput"

export { TextInput } 