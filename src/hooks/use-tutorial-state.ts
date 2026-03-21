import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getTutorialConfig,
  getTutorialScreenFromPath,
  type TutorialProfile,
  type TutorialScreen,
  type TutorialScreenConfig,
} from "@/lib/tutorial-config";
import {
  hasSeenTutorialVersion,
  markTutorialCompleted,
  markTutorialSeen,
  markTutorialSkipped,
  readTutorialState,
  type TutorialState,
  serializeTutorialState,
  writeTutorialState,
} from "@/lib/tutorial-storage";

type UseTutorialStateArgs = {
  pathname: string;
  userId?: string | null;
  profileRole?: TutorialProfile | null;
  profileState?: unknown;
};

export const useTutorialState = ({ pathname, userId, profileRole, profileState }: UseTutorialStateArgs) => {
  const routeScreen = useMemo(() => getTutorialScreenFromPath(pathname), [pathname]);
  const [state, setState] = useState<TutorialState>(() => readTutorialState(userId, profileRole, profileState));
  const [activeScreen, setActiveScreen] = useState<TutorialScreen | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setState(readTutorialState(userId, profileRole, profileState));
  }, [userId, profileRole, profileState]);

  const currentConfig = useMemo<TutorialScreenConfig | null>(() => {
    return getTutorialConfig(activeScreen ?? routeScreen, profileRole);
  }, [activeScreen, routeScreen, profileRole]);

  const routeConfig = useMemo<TutorialScreenConfig | null>(() => {
    return getTutorialConfig(routeScreen, profileRole);
  }, [routeScreen, profileRole]);

  const autoOpenEligible = useMemo(() => {
    if (!routeConfig || !routeScreen) return false;
    return !hasSeenTutorialVersion(state, routeScreen, routeConfig.version);
  }, [routeConfig, routeScreen, state]);

  useEffect(() => {
    if (!routeScreen || !routeConfig || !autoOpenEligible) return;
    setActiveScreen(routeScreen);
    setStepIndex(0);
    persistWith((current) => markTutorialSeen(current, routeScreen));
  }, [autoOpenEligible, profileRole, routeConfig, routeScreen, userId]);

  useEffect(() => {
    if (!activeScreen || activeScreen === routeScreen) return;
    setActiveScreen(null);
    setStepIndex(0);
  }, [activeScreen, routeScreen]);

  useEffect(() => {
    if (!activeScreen) return;
    const config = getTutorialConfig(activeScreen, profileRole);
    if (!config) {
      setActiveScreen(null);
      setStepIndex(0);
      return;
    }
    if (stepIndex >= config.steps.length) {
      setStepIndex(Math.max(0, config.steps.length - 1));
    }
  }, [activeScreen, profileRole, stepIndex]);

  const persistWith = (transform: (current: TutorialState) => TutorialState) => {
    setState((current) => {
      const nextState = transform(current);
      writeTutorialState(userId, profileRole, nextState);

      if (userId) {
        void supabase
          .from("profiles")
          .update({ tutorial_state: serializeTutorialState(nextState) })
          .eq("user_id", userId)
          .then(() => undefined)
          .catch(() => undefined);
      }

      return nextState;
    });
  };

  const openTutorial = (screen?: TutorialScreen | null) => {
    const targetScreen = screen ?? routeScreen;
    if (!targetScreen) return;

    const config = getTutorialConfig(targetScreen, profileRole);
    if (!config) return;

    setActiveScreen(targetScreen);
    setStepIndex(0);
    persistWith((current) => markTutorialSeen(current, targetScreen));
  };

  const closeTutorial = () => {
    if (!activeScreen) return;
    const config = getTutorialConfig(activeScreen, profileRole);
    if (!config) return;

    persistWith((current) => markTutorialSkipped(current, activeScreen, config.version));
    setActiveScreen(null);
    setStepIndex(0);
  };

  const finishTutorial = () => {
    if (!activeScreen) return;
    const config = getTutorialConfig(activeScreen, profileRole);
    if (!config) return;

    persistWith((current) => markTutorialCompleted(current, activeScreen, config.version));
    setActiveScreen(null);
    setStepIndex(0);
  };

  const nextStep = () => {
    if (!currentConfig) return;
    setStepIndex((current) => Math.min(current + 1, currentConfig.steps.length - 1));
  };

  const prevStep = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  return {
    state,
    routeScreen,
    routeConfig,
    currentConfig,
    activeScreen,
    stepIndex,
    isOpen: !!activeScreen && !!currentConfig,
    autoOpenEligible,
    openTutorial,
    closeTutorial,
    finishTutorial,
    nextStep,
    prevStep,
    setStepIndex,
  };
};
