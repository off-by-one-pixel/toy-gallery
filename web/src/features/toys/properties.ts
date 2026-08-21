import type { Toy } from '@/api/types';
import type { Girth } from '@/features/preferences/girth';
import { formatValue, type Unit } from '@/features/preferences/units';
import { formatDuration } from '@/lib/duration';

export type ToyLabelContext = Readonly<{
  t: (key: string) => string;
  girth: Girth;
}>;

export type ToyPropertyContext = ToyLabelContext &
  Readonly<{
    unit: Unit;
    locale: string;
  }>;

type BaseProperty = Readonly<{
  label: (ctx: ToyLabelContext) => string;
  sortValue: (toy: Toy) => number | string;
}>;

export type ToyProperty =
  | (BaseProperty & Readonly<{ onCard: true }>)
  | (BaseProperty & Readonly<{ onCard: false; format: (toy: Toy, ctx: ToyPropertyContext) => string | null }>);

export const TOY_PROPERTIES = {
  name: {
    onCard: true,
    label: (ctx) => ctx.t('sort.column.name'),
    sortValue: (toy) => `${toy.brand} ${toy.name}`.toLowerCase(),
  },
  insertable: {
    onCard: true,
    label: (ctx) => ctx.t('common.insertable'),
    sortValue: (toy) => toy.insertableLength ?? -Infinity,
  },
  total: {
    onCard: false,
    label: (ctx) => ctx.t('common.totalLength'),
    sortValue: (toy) => toy.totalLength ?? -Infinity,
    format: (toy, ctx) => (toy.totalLength == null ? null : `${formatValue(toy.totalLength, ctx.unit)} ${ctx.unit.id}`),
  },
  circumference: {
    onCard: true,
    label: (ctx) => ctx.t(`common.${ctx.girth}`),
    sortValue: (toy) => toy.circumference ?? -Infinity,
  },
  popularity: {
    onCard: false,
    label: (ctx) => ctx.t('sort.column.popularity'),
    sortValue: (toy) => toy.usageCount ?? 0,
    format: (toy) => `${toy.usageCount ?? 0}`,
  },
  duration: {
    onCard: false,
    label: (ctx) => ctx.t('sort.column.duration'),
    sortValue: (toy) => toy.totalDurationMinutes ?? 0,
    format: (toy, ctx) => formatDuration(toy.totalDurationMinutes ?? 0, ctx.locale),
  },
} as const satisfies Record<string, ToyProperty>;

export type ToyPropertyKey = keyof typeof TOY_PROPERTIES;
