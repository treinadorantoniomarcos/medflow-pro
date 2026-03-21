import { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  type TutorialProfile,
  type TutorialScreen,
  getTutorialConfig,
} from "@/lib/tutorial-config";
import { useTutorialState } from "@/hooks/use-tutorial-state";
import FirstAccessTour from "./FirstAccessTour";

type AppRole = TutorialProfile;

type TutorialContextValue = {
  routeScreen: TutorialScreen | null;
  routeConfig: ReturnType<typeof getTutorialConfig>;
  currentConfig: ReturnType<typeof getTutorialConfig>;
  isOpen: boolean;
  stepIndex: number;
  openTutorial: (screen?: TutorialScreen | null) => void;
  closeTutorial: () => void;
  finishTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
};

const TutorialProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, profile } = useAuth();

  const { data: role } = useQuery({
    queryKey: ["tutorial-user-role", user?.id, profile?.tenant_id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", user!.id);
      if (error) throw error;

      const roles = (data ?? []) as Array<{ role: AppRole; tenant_id: string }>;
      if (roles.some((item) => item.role === "super_admin")) return "super_admin";
      const scoped = roles.find((item) => item.tenant_id === profile?.tenant_id);
      return scoped?.role ?? null;
    },
  });

  const tutorial = useTutorialState({
    pathname: location.pathname,
    userId: user?.id ?? null,
    profileRole: role ?? null,
    profileState: profile?.tutorial_state ?? null,
  });

  const value: TutorialContextValue = {
    routeScreen: tutorial.routeScreen,
    routeConfig: tutorial.routeConfig,
    currentConfig: tutorial.currentConfig,
    isOpen: tutorial.isOpen,
    stepIndex: tutorial.stepIndex,
    openTutorial: tutorial.openTutorial,
    closeTutorial: tutorial.closeTutorial,
    finishTutorial: tutorial.finishTutorial,
    nextStep: tutorial.nextStep,
    prevStep: tutorial.prevStep,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <FirstAccessTour
        isOpen={tutorial.isOpen}
        config={tutorial.currentConfig}
        stepIndex={tutorial.stepIndex}
        onNext={tutorial.nextStep}
        onPrev={tutorial.prevStep}
        onClose={tutorial.closeTutorial}
        onFinish={tutorial.finishTutorial}
      />
    </TutorialContext.Provider>
  );
};

export default TutorialProvider;
