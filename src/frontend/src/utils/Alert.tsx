import type { AlertColor, SnackbarOrigin } from '@mui/material';

import { varAlpha } from 'minimal-shared/utils';
import { useState, useContext, createContext } from 'react';

import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Alert, alpha, Snackbar, useTheme, AlertTitle, Typography } from '@mui/material';

// Tipagem para alinhamento opcional do Snackbar
interface AlertOptions {
  severity?: AlertColor;
  duration?: number;
  vertical?: SnackbarOrigin['vertical'];
  horizontal?: SnackbarOrigin['horizontal'];
}

interface AlertContextType {
  showAlert: (message: string, options?: AlertOptions) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [alert, setAlert] = useState({
    message: '',
    severity: 'info' as AlertColor,
    open: false,
    duration: 3000,
    vertical: 'bottom' as SnackbarOrigin['vertical'],
    horizontal: 'center' as SnackbarOrigin['horizontal'],
  });

  const showAlert = (message: string, options: AlertOptions = {}) => {
    setAlert({
      message,
      severity: options.severity || 'info',
      open: true,
      duration: options.duration || 3000,
      vertical: options.vertical || 'bottom',
      horizontal: options.horizontal || 'center',
    });
  };

  // 🔹 Criando atalhos com configurações predefinidas
  const showError = (message: string) => {
    showAlert(message, {
      severity: 'error',
      duration: 10000,
      vertical: 'top',
      horizontal: 'center',
    });
  };

  const showSuccess = (message: string) => {
    showAlert(message, {
      severity: 'success',
      duration: 3000,
      vertical: 'bottom',
      horizontal: 'center',
    });
  };

  const showWarning = (message: string) => {
    showAlert(message, {
      severity: 'warning',
      duration: 5000,
      vertical: 'top',
      horizontal: 'right',
    });
  };

  const showInfo = (message: string) => {
    showAlert(message, { severity: 'info', duration: 4000, vertical: 'top', horizontal: 'left' });
  };

  const severityIconMap: Record<AlertColor, React.ReactNode> = {
    success: <CheckCircleRoundedIcon fontSize="inherit" />,
    error: <ErrorRoundedIcon fontSize="inherit" />,
    warning: <WarningAmberRoundedIcon fontSize="inherit" />,
    info: <InfoRoundedIcon fontSize="inherit" />,
  };

  const severityTitleMap: Record<AlertColor, string> = {
    success: 'Sucesso',
    error: 'Falha',
    warning: 'Atenção',
    info: 'Informação',
  };

  const palette = theme.vars?.palette ?? theme.palette;
  const shadow = theme.vars?.customShadows?.z8 ?? theme.shadows[8];

  const paletteBySeverity = {
    success: palette.success,
    error: palette.error,
    warning: palette.warning,
    info: palette.info,
  }[alert.severity];

  const alphaBySeverity = (opacity: number) => {
    const channel = (paletteBySeverity as { mainChannel?: string }).mainChannel;
    return channel ? varAlpha(channel, opacity) : alpha(paletteBySeverity.main, opacity);
  };

  const iconBg = alphaBySeverity(0.16);
  const iconColor = paletteBySeverity.main;
  const borderColor = alphaBySeverity(0.32);
  const surfaceColor =
    theme.palette.mode === 'dark' ? alphaBySeverity(0.14) : alphaBySeverity(0.08);

  return (
    <AlertContext.Provider value={{ showAlert, showError, showSuccess, showWarning, showInfo }}>
      {children}
      <Snackbar
        open={alert.open}
        autoHideDuration={alert.duration}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: alert.vertical, horizontal: alert.horizontal }}
      >
        <Alert
          severity={alert.severity}
          icon={severityIconMap[alert.severity]}
          onClose={() => setAlert({ ...alert, open: false })}
          sx={{
            width: '100%',
            minWidth: { xs: 280, sm: 360 },
            borderRadius: 1.5,
            alignItems: 'flex-start',
            bgcolor: surfaceColor,
            color: palette.text.primary,
            border: `1px solid ${borderColor}`,
            borderLeftWidth: 6,
            boxShadow: shadow,
            '& .MuiAlert-icon': {
              mt: 0.125,
              p: 0.5,
              borderRadius: 1,
              fontSize: 22,
              color: iconColor,
              bgcolor: iconBg,
            },
            '& .MuiAlert-message': {
              py: 0.25,
              width: '100%',
            },
          }}
        >
          <AlertTitle sx={{ m: 0, mb: 0.25, fontWeight: 700 }}>
            {severityTitleMap[alert.severity]}
          </AlertTitle>
          <Typography variant="body2">{alert.message}</Typography>
        </Alert>
      </Snackbar>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert deve ser usado dentro de um AlertProvider');
  }
  return context;
}
