export const buildClinicBookingPath = (slug: string) => `/agendar/${slug}`;

export const buildProfessionalAccessPath = (slug: string) => `/acesso/${slug}/profissionais`;

export const buildAbsoluteTenantUrl = (path: string, origin = window.location.origin) =>
  `${origin}${path}`;
