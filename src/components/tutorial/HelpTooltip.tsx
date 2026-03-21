import * as React from "react";
import { TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type HelpTooltipProps = React.ComponentPropsWithoutRef<typeof TooltipContent> & {
  children: React.ReactNode;
};

const HelpTooltip = React.forwardRef<
  React.ElementRef<typeof TooltipContent>,
  HelpTooltipProps
>(({ className, children, ...props }, ref) => (
  <TooltipContent
    ref={ref}
    side="bottom"
    className={cn("max-w-xs text-xs leading-5", className)}
    {...props}
  >
    {children}
  </TooltipContent>
));

HelpTooltip.displayName = "HelpTooltip";

export default HelpTooltip;

