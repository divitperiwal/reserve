import type { Category } from './types';

// First matching keyword wins, so more specific dishes come first
const rules: [RegExp, string][] = [
  [/lemon rice/, 'lemon-rice'],
  [/curd rice/, 'curd-rice'],
  [/biryani/, 'biryani'],
  [/fried rice|pulao/, 'fried-rice'],
  [/paneer/, 'paneer'],
  [/chapati|kurma|roti|paratha/, 'chapati'],
  [/idli|vada|dosa/, 'idli'],
  [/sandwich/, 'sandwich'],
  [/puff/, 'puffs'],
  [/cake/, 'cake'],
  [/bread|bun|loaf/, 'bread'],
  [/banana|fruit/, 'bananas'],
  [/tomato|onion|vegetable/, 'vegetables'],
  [/dal|grain|sack|atta/, 'grains'],
  [/meals|lunch|thali|dinner/, 'meals'],
  [/sambar/, 'sambar-rice'],
];

const byCategory: Record<Category, string> = {
  COOKED: 'meals',
  BAKERY: 'bread',
  FRUIT_VEG: 'vegetables',
  PACKAGED: 'sandwich',
  RAW: 'grains',
};

export function foodImage(d: { title: string; category: Category; photoUrl?: string }) {
  if (d.photoUrl) return d.photoUrl;
  const t = d.title.toLowerCase();
  const key = rules.find(([re]) => re.test(t))?.[1] ?? byCategory[d.category];
  return `/food/${key}.jpg`;
}

export const categoryImage = (c: Category) => `/food/${byCategory[c]}.jpg`;
