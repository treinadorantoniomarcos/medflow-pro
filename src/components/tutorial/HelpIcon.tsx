import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import HelpTooltip from "./HelpTooltip";
import { useTutorial } from "./TutorialProvider";
import { type TutorialScreen, getTutorialConfig } from "@/lib/tutorial-config";
import { cn } from "@/lib/utils";

type HelpIconProps = {
  screen?: TutorialScreen | null;
  className?: string;
};

const HelpIcon = ({ screen, className }: HelpIconProps) => {
  const tutorial = useTutorial();
  const config = getTutorialConfig(screen ?? tutorial.routeScreen, null) ?? tutorial.routeConfig;

  if (!config) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("text-muted-foreground hover:text-foreground", className)}
          onClick={() => tutorial.openTutorial(screen ?? tutorial.routeScreen)}
          aria-label={config.helpButtonLabel}
        >
          <CircleHelp className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <HelpTooltip>{config.tooltip}</HelpTooltip>
    </Tooltip>
  );
};

export default HelpIcon;

