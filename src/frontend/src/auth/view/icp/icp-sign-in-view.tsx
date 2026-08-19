import Box from '@mui/material/Box';

import LoginButton from './login-button';
import { FormHead } from '../../components/form-head';

// ----------------------------------------------------------------------

export function IcpSignInView() {
  return (
    <>
      <FormHead
        title="Sign in to your account"
        description={
          <>
            {`Don’t have an account? `}
            <p>An account will be automatically created when you log in.</p>
          </>
        }
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: { xs: 'center', md: 'flex-start' },
          gap: 3,
        }}
      >
        <LoginButton />
      </Box>
    </>
  );
}
