import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';

import { ProfileAvatar } from 'src/components/profile-avatar';

export function NavUpgrade({ sx, ...other }: BoxProps) {
  return (
    <Box
      sx={[{ px: 2, py: 5, textAlign: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...other}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        <ProfileAvatar />
      </Box>
    </Box>
  );
}
