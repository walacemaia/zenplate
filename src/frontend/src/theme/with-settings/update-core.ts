import type { ColorSystem } from '@mui/material/styles';
import type { SettingsState } from 'src/components/settings';

import { setFont, hexToRgbChannel, createPaletteChannel } from 'minimal-shared/utils';

import { primaryColorPresets } from './color-presets';
import { createShadowColor } from '../core/custom-shadows';

import type { ThemeOptions, ThemeColorScheme } from '../types';

type RgbColor = { r: number; g: number; b: number };
type HslColor = { h: number; s: number; l: number };
type PaletteSeed = {
  lighter: string;
  light: string;
  main: string;
  dark: string;
  darker: string;
  contrastText: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeHex = (hex: string): string => {
  const sanitized = hex.trim().replace('#', '');
  if (sanitized.length === 3) {
    return `#${sanitized
      .split('')
      .map((v) => `${v}${v}`)
      .join('')}`;
  }
  return `#${sanitized.slice(0, 6)}`;
};

const hexToRgb = (hex: string): RgbColor => {
  const normalized = normalizeHex(hex);
  const value = parseInt(normalized.slice(1), 16);

  return {
    r: Math.floor(value / 65536) % 256,
    g: Math.floor(value / 256) % 256,
    b: value % 256,
  };
};

const rgbToHex = ({ r, g, b }: RgbColor): string =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;

const rgbToHsl = ({ r, g, b }: RgbColor): HslColor => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  return { h, s, l };
};

const hslToRgb = ({ h, s, l }: HslColor): RgbColor => {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hue < 60) {
    rp = c;
    gp = x;
  } else if (hue < 120) {
    rp = x;
    gp = c;
  } else if (hue < 180) {
    gp = c;
    bp = x;
  } else if (hue < 240) {
    gp = x;
    bp = c;
  } else if (hue < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  };
};

const srgbToLinear = (value: number) => {
  const v = value / 255;
  if (v <= 0.03928) {
    return v / 12.92;
  }
  return ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
};

const contrastRatio = (bgHex: string, fgHex: string) => {
  const bg = luminance(bgHex);
  const fg = luminance(fgHex);
  const lighter = Math.max(bg, fg);
  const darker = Math.min(bg, fg);
  return (lighter + 0.05) / (darker + 0.05);
};

const pickContrastText = (bgHex: string) => {
  const white = '#FFFFFF';
  const dark = '#1C252E';

  const whiteContrast = contrastRatio(bgHex, white);
  const darkContrast = contrastRatio(bgHex, dark);

  return darkContrast >= whiteContrast ? dark : white;
};

const deriveSecondaryHex = (
  primaryHex: string,
  tone: { hueShift: number; saturationScale: number; lightnessOffset: number }
) => {
  const baseHsl = rgbToHsl(hexToRgb(primaryHex));
  const nextHsl: HslColor = {
    h: (baseHsl.h + tone.hueShift + 360) % 360,
    s: clamp(baseHsl.s * tone.saturationScale, 0.12, 0.78),
    l: clamp(baseHsl.l + tone.lightnessOffset, 0.18, 0.9),
  };

  return rgbToHex(hslToRgb(nextHsl));
};

const deriveSecondaryPalette = (primaryPalette: PaletteSeed): PaletteSeed => {
  const secondaryMain = deriveSecondaryHex(primaryPalette.main, {
    hueShift: 24,
    saturationScale: 0.72,
    lightnessOffset: 0.06,
  });

  return {
    lighter: deriveSecondaryHex(primaryPalette.main, {
      hueShift: 22,
      saturationScale: 0.54,
      lightnessOffset: 0.28,
    }),
    light: deriveSecondaryHex(primaryPalette.main, {
      hueShift: 24,
      saturationScale: 0.64,
      lightnessOffset: 0.18,
    }),
    main: secondaryMain,
    dark: deriveSecondaryHex(primaryPalette.main, {
      hueShift: 26,
      saturationScale: 0.82,
      lightnessOffset: -0.08,
    }),
    darker: deriveSecondaryHex(primaryPalette.main, {
      hueShift: 28,
      saturationScale: 0.9,
      lightnessOffset: -0.16,
    }),
    contrastText: pickContrastText(secondaryMain),
  };
};

// ----------------------------------------------------------------------

/**
 * Update the core theme with the settings state.
 * @contrast
 * @primaryColor
 */

export function updateCoreWithSettings(
  theme: ThemeOptions,
  settingsState?: SettingsState
): ThemeOptions {
  const {
    direction,
    fontFamily,
    contrast = 'default',
    primaryColor = 'default',
  } = settingsState ?? {};

  const isDefaultContrast = contrast === 'default';
  const isDefaultPrimaryColor = primaryColor === 'default';

  const lightPalette = theme.colorSchemes?.light.palette as ColorSystem['palette'];

  const updatedPrimaryColor = createPaletteChannel(primaryColorPresets[primaryColor]);

  const updateColorScheme = (scheme: ThemeColorScheme) => {
    const colorSchemes = theme.colorSchemes?.[scheme];
    const activePrimaryColor = (!isDefaultPrimaryColor
      ? updatedPrimaryColor
      : colorSchemes?.palette?.primary) as unknown as PaletteSeed;
    const updatedSecondaryColor = createPaletteChannel(deriveSecondaryPalette(activePrimaryColor));

    const updatedPalette = {
      ...colorSchemes?.palette,
      ...(!isDefaultPrimaryColor && {
        primary: updatedPrimaryColor,
      }),
      secondary: updatedSecondaryColor,
      ...(scheme === 'light' && {
        background: {
          ...lightPalette?.background,
          ...(!isDefaultContrast && {
            default: lightPalette.grey[200],
            defaultChannel: hexToRgbChannel(lightPalette.grey[200]),
          }),
        },
      }),
    };

    const updatedCustomShadows = {
      ...colorSchemes?.customShadows,
      ...(!isDefaultPrimaryColor && {
        primary: createShadowColor(updatedPrimaryColor.mainChannel),
      }),
      secondary: createShadowColor(updatedSecondaryColor.mainChannel),
    };

    return {
      ...colorSchemes,
      palette: updatedPalette,
      customShadows: updatedCustomShadows,
    };
  };

  return {
    ...theme,
    direction,
    colorSchemes: {
      light: updateColorScheme('light'),
      dark: updateColorScheme('dark'),
    },
    typography: {
      ...theme.typography,
      fontFamily: setFont(fontFamily),
    },
  };
}
