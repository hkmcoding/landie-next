"use client"

import * as React from "react"
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
    const generatedId = React.useId()
    const inputId = id || generatedId
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
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 tooltip-popover">
                    {tooltip}
                    <div className="tooltip-arrow"></div>
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
          <p className="text-description">{description}</p>
        )}
      </div>
    )
  }
)

TextInput.displayName = "TextInput"

export { TextInput } 