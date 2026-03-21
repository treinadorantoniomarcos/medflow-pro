import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TutorialScreenConfig } from "@/lib/tutorial-config";

type FirstAccessTourProps = {
  isOpen: boolean;
  config: TutorialScreenConfig | null;
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onFinish: () => void;
};

const FirstAccessTour = ({
  isOpen,
  config,
  stepIndex,
  onNext,
  onPrev,
  onClose,
  onFinish,
}: FirstAccessTourProps) => {
  if (!isOpen || !config || config.steps.length === 0) return null;

  const currentStep = config.steps[Math.min(stepIndex, config.steps.length - 1)];
  const isLastStep = stepIndex >= config.steps.length - 1;
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });

  const updateTargetRect = () => {
    if (!currentStep.target) {
      setTargetRect(null);
      return;
    }

    const node = document.querySelector(currentStep.target) as HTMLElement | null;
    if (!node) {
      setTargetRect(null);
      return;
    }

    node.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    const rect = node.getBoundingClientRect();
    setTargetRect(rect);
  };

  useLayoutEffect(() => {
    updateTargetRect();
    const raf = window.requestAnimationFrame(updateTargetRect);
    return () => window.cancelAnimationFrame(raf);
    // currentStep.target changes when the user navigates the tutorial
  }, [currentStep.target]);

  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      updateTargetRect();
    };

    const handleScroll = () => updateTargetRect();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [currentStep.target]);

  const cardPosition = useMemo(() => {
    if (!targetRect) return { top: "auto", left: "auto", right: "16px", bottom: "16px" };

    const cardWidth = Math.min(420, viewport.width - 32);
    const fitsBelow = targetRect.bottom + 260 < viewport.height;
    const fitsRight = targetRect.right + cardWidth + 24 < viewport.width;

    if (fitsBelow && fitsRight) {
      return {
        top: `${Math.min(viewport.height - 20, targetRect.bottom + 16)}px`,
        left: `${Math.min(viewport.width - cardWidth - 16, targetRect.right + 16)}px`,
        right: "auto",
        bottom: "auto",
      };
    }

    if (fitsBelow) {
      return {
        top: `${Math.min(viewport.height - 20, targetRect.bottom + 16)}px`,
        left: "16px",
        right: "16px",
        bottom: "auto",
      };
    }

    return { top: "auto", left: "auto", right: "16px", bottom: "16px" };
  }, [targetRect, viewport.height, viewport.width]);

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      <div className="absolute inset-0 bg-background/45 backdrop-blur-[1px]" />
      {targetRect && (
        <>
          <div
            className="fixed bg-background/35"
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, targetRect.top - 10) }}
          />
          <div
            className="fixed bg-background/35"
            style={{
              top: Math.max(0, targetRect.top - 10),
              left: 0,
              width: Math.max(0, targetRect.left - 10),
              height: Math.max(0, targetRect.height + 20),
            }}
          />
          <div
            className="fixed bg-background/35"
            style={{
              top: Math.max(0, targetRect.top - 10),
              left: Math.min(viewport.width, targetRect.right + 10),
              right: 0,
              height: Math.max(0, targetRect.height + 20),
            }}
          />
          <div
            className="fixed bg-background/35"
            style={{
              left: 0,
              right: 0,
              top: Math.min(viewport.height, targetRect.bottom + 10),
              bottom: 0,
            }}
          />
          <div
            className="fixed rounded-2xl ring-2 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0)]"
            style={{
              top: Math.max(0, targetRect.top - 8),
              left: Math.max(0, targetRect.left - 8),
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: "0 0 0 2px hsl(var(--primary)), 0 0 0 9999px rgba(0,0,0,0)",
            }}
          />
        </>
      )}

      <Card
        className="pointer-events-auto absolute w-[min(92vw,420px)] border-border/80 shadow-2xl"
        style={cardPosition}
      >
        <CardHeader className="space-y-2 border-b border-border/60 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Badge variant="secondary" className="w-fit">
                Tutorial rapido
              </Badge>
              <CardTitle className="text-base">{currentStep.title}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label={config.closeLabel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{config.tooltip}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Etapa {stepIndex + 1} de {config.steps.length}
              </span>
              <span>{currentStep.key}</span>
            </div>

            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <p className="text-sm font-semibold text-foreground">{currentStep.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{currentStep.text}</p>
              {currentStep.target && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Alvo da ajuda:{" "}
                  <span className="font-mono text-[11px] text-foreground">{currentStep.target}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {config.steps.map((step, index) => (
              <span
                key={step.key}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-colors",
                  index === stepIndex ? "bg-primary" : "bg-muted"
                )}
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={onClose} className="sm:order-1">
              {config.skipLabel}
            </Button>

            <div className="flex gap-2 sm:order-2">
              <Button variant="outline" onClick={onPrev} disabled={stepIndex === 0}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {config.prevLabel}
              </Button>
              {isLastStep ? (
                <Button onClick={onFinish}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {config.finishLabel}
                </Button>
              ) : (
                <Button onClick={onNext}>
                  {config.nextLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FirstAccessTour;
