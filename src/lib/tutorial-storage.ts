import type { TutorialScreen } from "@/lib/tutorial-config";

export type TutorialState = {
  completedVersions: Partial<Record<TutorialScreen, number>>;
  skippedVersions: Partial<Record<TutorialScreen, number>>;
  lastSeenAt: Partial<Record<TutorialScreen, string>>;
};

const emptyState = (): TutorialState => ({
  completedVersions: {},
  skippedVersions: {},
  lastSeenAt: {},
});

const normalizeState = (value: unknown): TutorialState => {
  if (!value || typeof value !== "object") return emptyState();
  const raw = value as Partial<TutorialState>;
  return {
    completedVersions: raw.completedVersions ?? {},
    skippedVersions: raw.skippedVersions ?? {},
    lastSeenAt: raw.lastSeenAt ?? {},
  };
};

const mergeStates = (primary: TutorialState, secondary?: TutorialState | null): TutorialState => {
  if (!secondary) return primary;

  const screens = new Set<TutorialScreen>([
    ...Object.keys(primary.completedVersions) as TutorialScreen[],
    ...Object.keys(primary.skippedVersions) as TutorialScreen[],
    ...Object.keys(primary.lastSeenAt) as TutorialScreen[],
    ...Object.keys(secondary.completedVersions) as TutorialScreen[],
    ...Object.keys(secondary.skippedVersions) as TutorialScreen[],
    ...Object.keys(secondary.lastSeenAt) as TutorialScreen[],
  ]);

  const merged: TutorialState = emptyState();
  screens.forEach((screen) => {
    const completed = primary.completedVersions[screen] ?? secondary.completedVersions[screen];
    const skipped = primary.skippedVersions[screen] ?? secondary.skippedVersions[screen];
    const lastSeenCandidates = [primary.lastSeenAt[screen], secondary.lastSeenAt[screen]]
      .filter((item): item is string => Boolean(item))
      .sort();
    const lastSeenAt = lastSeenCandidates[lastSeenCandidates.length - 1];

    if (completed !== undefined) merged.completedVersions[screen] = completed;
    if (skipped !== undefined) merged.skippedVersions[screen] = skipped;
    if (lastSeenAt) merged.lastSeenAt[screen] = lastSeenAt;
  });

  return merged;
};

const getStorageKey = (userId?: string | null, profileRole?: string | null) =>
  `medflow.tutorials.${userId ?? "guest"}.${profileRole ?? "guest"}`;

export const readTutorialState = (
  userId?: string | null,
  profileRole?: string | null,
  profileState?: unknown,
): TutorialState => {
  if (typeof window === "undefined") return emptyState();

  const key = getStorageKey(userId, profileRole);
  const raw = window.localStorage.getItem(key);
  const localState = raw ? (() => {
    try {
      return normalizeState(JSON.parse(raw) as TutorialState);
    } catch {
      return emptyState();
    }
  })() : emptyState();

  return mergeStates(localState, normalizeState(profileState));
};

export const writeTutorialState = (
  userId?: string | null,
  profileRole?: string | null,
  state?: TutorialState,
) => {
  if (typeof window === "undefined") return;
  const key = getStorageKey(userId, profileRole);
  window.localStorage.setItem(key, JSON.stringify(state ?? emptyState()));
};

export const serializeTutorialState = (state?: TutorialState | null) => ({
  completedVersions: state?.completedVersions ?? {},
  skippedVersions: state?.skippedVersions ?? {},
  lastSeenAt: state?.lastSeenAt ?? {},
});

export const hasSeenTutorialVersion = (
  state: TutorialState,
  screen: TutorialScreen,
  version: number,
) => {
  return (
    state.completedVersions[screen] === version ||
    state.skippedVersions[screen] === version
  );
};

export const markTutorialCompleted = (
  state: TutorialState,
  screen: TutorialScreen,
  version: number,
) => ({
  ...state,
  completedVersions: (() => {
    const completedVersions = { ...state.completedVersions };
    completedVersions[screen] = version;
    return completedVersions;
  })(),
  skippedVersions: (() => {
    const skippedVersions = { ...state.skippedVersions };
    delete skippedVersions[screen];
    return skippedVersions;
  })(),
  lastSeenAt: {
    ...state.lastSeenAt,
    [screen]: new Date().toISOString(),
  },
});

export const markTutorialSkipped = (
  state: TutorialState,
  screen: TutorialScreen,
  version: number,
) => ({
  ...state,
  skippedVersions: (() => {
    const skippedVersions = { ...state.skippedVersions };
    skippedVersions[screen] = version;
    return skippedVersions;
  })(),
  completedVersions: (() => {
    const completedVersions = { ...state.completedVersions };
    delete completedVersions[screen];
    return completedVersions;
  })(),
  lastSeenAt: {
    ...state.lastSeenAt,
    [screen]: new Date().toISOString(),
  },
});

export const markTutorialSeen = (
  state: TutorialState,
  screen: TutorialScreen,
) => ({
  ...state,
  lastSeenAt: {
    ...state.lastSeenAt,
    [screen]: new Date().toISOString(),
  },
});
