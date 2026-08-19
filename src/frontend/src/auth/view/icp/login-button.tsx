import React from 'react';

//import LoginIcon from "@mui/icons-material/Login"; // Ícone de Login
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import ExitToAppIcon from '@mui/icons-material/ExitToApp'; // Ícone de Logout
import FormControlLabel from '@mui/material/FormControlLabel';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

const dfinityLogo = '/assets/icons/platforms/icp-logo-mark.svg'; // 🔹 Link para o logo da Dfinity

const REMEMBER_ME_STORAGE_KEY = 'icp_app.auth.rememberMe';

const LoginButton: React.FC = () => {
  const { isAuthenticated, login, logout } = useIcpContext();
  const [rememberMe, setRememberMe] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY) === 'true';
  });

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, checked ? 'true' : 'false');
    }
  };

  const handleLogin = () => {
    void login({ rememberMe });
  };

  return (
    <Stack direction="column" spacing={1.5}>
      {!isAuthenticated && (
        <FormControlLabel
          control={
            <Checkbox
              checked={rememberMe}
              onChange={(e) => handleRememberMeChange(e.target.checked)}
            />
          }
          label="Lembrar de mim"
          sx={{ ml: 0 }}
        />
      )}
      <Button
        variant="contained"
        color={isAuthenticated ? 'primary' : 'secondary'}
        sx={{
          width: 'fit-content',
          minWidth: 'unset',
          px: 2,
          py: 1,
          whiteSpace: 'nowrap',
          '& .MuiButton-startIcon': {
            marginLeft: 0,
            marginRight: 1,
          },
        }}
        startIcon={
          isAuthenticated ? (
            <ExitToAppIcon />
          ) : (
            <img src={dfinityLogo} width="20" height="20" alt="Internet Identity" />
          )
        }
        onClick={isAuthenticated ? logout : handleLogin}
      >
        {isAuthenticated ? 'Logout' : 'Login with Internet Identity'}
      </Button>
    </Stack>
  );
};

export default LoginButton;
