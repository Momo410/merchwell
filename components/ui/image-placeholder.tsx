import { cn } from "cn";
import { ImageIcon } from "@/components/ui/pixel-icons";
import type { ComponentProps } from "react";

interface ImagePlaceholderProps extends ComponentProps<"div"> {
  iconClassName?: string;
}

function ImagePlaceholder({ className, iconClassName, ...props }: ImagePlaceholderProps) {
  return (
    <div
      data-slot="image-placeholder"
      className={cn("flex items-center justify-center bg-muted", className)}
      {...props}
    >
      <ImageIcon
        aria-hidden
        strokeWidth={1.5}
        className={cn("h-auto w-1/3 max-w-40 text-accent", iconClassName)}
      />
    </div>
  );
}

export { ImagePlaceholder };
