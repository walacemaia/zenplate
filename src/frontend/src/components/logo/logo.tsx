import type { LinkProps } from '@mui/material/Link';

import { useId, forwardRef } from 'react';
import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { styled, useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/global-config';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type LogoProps = LinkProps & {
  isSingle?: boolean;
  disabled?: boolean;
};

export const Logo = forwardRef<HTMLAnchorElement, LogoProps>((props, ref) => {
  const { className, href = '/', isSingle = true, disabled, sx, ...other } = props;

  const theme = useTheme();

  const gradientId = useId();

  const TEXT_PRIMARY = theme.vars.palette.text.primary;
  const PRIMARY_LIGHT = theme.vars.palette.primary.light;
  const PRIMARY_MAIN = theme.vars.palette.primary.main;
  const PRIMARY_DARKER = theme.vars.palette.primary.dark;

  /*
   * Logos usando SVG como mask para aplicar cor do tema
   */
  const singleLogo = (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: PRIMARY_MAIN,
        mask: `url(${CONFIG.assetsDir}/logo/logo-single.svg) no-repeat center / contain`,
        WebkitMask: `url(${CONFIG.assetsDir}/logo/logo-single.svg) no-repeat center / contain`,
      }}
    />
  );

  const fullLogo = (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: PRIMARY_MAIN,
        mask: `url(${CONFIG.assetsDir}/logo/logo-full.svg) no-repeat center / contain`,
        WebkitMask: `url(${CONFIG.assetsDir}/logo/logo-full.svg) no-repeat center / contain`,
      }}
    />
  );

  return (
    <LogoRoot
      ref={ref}
      component={RouterLink}
      href={href}
      aria-label="Logo"
      underline="none"
      className={mergeClasses([logoClasses.root, className])}
      sx={[
        () => ({
          width: 40,
          height: 40,
          ...(!isSingle && { width: 204, height: 72 }),
          ...(disabled && { pointerEvents: 'none' }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {isSingle ? singleLogo : fullLogo}
    </LogoRoot>
  );
});

// ----------------------------------------------------------------------

const LogoRoot = styled(Link)(() => ({
  flexShrink: 0,
  color: 'transparent',
  display: 'inline-flex',
  verticalAlign: 'middle',
}));
