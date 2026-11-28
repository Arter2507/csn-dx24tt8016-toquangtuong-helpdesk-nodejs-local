export const palettes = [
  'navy',
  'peach',
  'rose',
  'lavender',
  'sage',
  'honey',
  'smoke',
  'teal',
] as const;
export type Palette = 'none' | 'glass' | (typeof palettes)[number];

export const skies = {
  light: [1, 2, 3, 4],
  dark: [1, 2, 3, 4, 5],
};

export function skyUrl(theme: keyof typeof skies, image: number) {
  return '/themes/sky/' + theme + 'mode-sky-background' + image + '.jpg';
}
