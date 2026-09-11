export const DOMAIN_KEYS = [
  'PURE_MATHEMATICS',
  'THEORETICAL_PHYSICS',
  'COMPUTATIONAL_NEUROSCIENCE',
  'PHILOSOPHY_LIFE',
  'APPLIED_AI',
] as const;

export type DomainKey = (typeof DOMAIN_KEYS)[number];

export function isDomainKey(value: string): value is DomainKey {
  return (DOMAIN_KEYS as readonly string[]).includes(value);
}

interface DomainMeta {
  key: DomainKey;
  slug: string;
  order: number; // 1-5, matches BrainModel lobe order
  label: string;
  lobe: string;
}

export const DOMAINS: Record<DomainKey, DomainMeta> = {
  PURE_MATHEMATICS: {
    key: 'PURE_MATHEMATICS',
    slug: 'pure-mathematics',
    order: 1,
    label: 'Pure Mathematics',
    lobe: 'Frontal',
  },
  THEORETICAL_PHYSICS: {
    key: 'THEORETICAL_PHYSICS',
    slug: 'theoretical-physics',
    order: 2,
    label: 'Theoretical Physics',
    lobe: 'Parietal',
  },
  COMPUTATIONAL_NEUROSCIENCE: {
    key: 'COMPUTATIONAL_NEUROSCIENCE',
    slug: 'computational-neuroscience',
    order: 3,
    label: 'Computational Neuroscience',
    lobe: 'Occipital',
  },
  PHILOSOPHY_LIFE: {
    key: 'PHILOSOPHY_LIFE',
    slug: 'philosophy-life',
    order: 4,
    label: 'Philosophy & Life',
    lobe: 'Temporal',
  },
  APPLIED_AI: {
    key: 'APPLIED_AI',
    slug: 'applied-ai',
    order: 5,
    label: 'Applied Artificial Intelligence',
    lobe: 'Cerebellum',
  },
};

export const DOMAIN_LIST: DomainMeta[] = DOMAIN_KEYS.map((k) => DOMAINS[k]).sort(
  (a, b) => a.order - b.order,
);

export function domainByOrder(order: number): DomainMeta | undefined {
  return DOMAIN_LIST.find((d) => d.order === order);
}

export function domainBySlug(slug: string): DomainMeta | undefined {
  return DOMAIN_LIST.find((d) => d.slug === slug);
}
