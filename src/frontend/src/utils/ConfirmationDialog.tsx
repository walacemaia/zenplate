import {
  Dialog,
  Button,
  DialogTitle,
  DialogActions,
  DialogContent,
  type ButtonProps,
  DialogContentText,
} from '@mui/material';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  cancelButtonColor?: ButtonProps['color'];
  confirmButtonColor?: ButtonProps['color'];
  cancelButtonVariant?: ButtonProps['variant'];
  confirmButtonVariant?: ButtonProps['variant'];
  autoFocusButton?: 'cancel' | 'confirm';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  onClose,
  onConfirm,
  cancelText = 'Não',
  confirmText = 'Sim',
  cancelButtonColor = 'primary',
  confirmButtonColor = 'secondary',
  cancelButtonVariant = 'text',
  confirmButtonVariant = 'text',
  autoFocusButton = 'confirm',
}) => (
  <Dialog
    open={open}
    onClose={(_, reason) => {
      if (reason === 'backdropClick') return;
      onClose();
    }}
    disableEscapeKeyDown
    fullWidth
    maxWidth="xs"
  >
    <DialogTitle sx={{ pb: { xs: 1, sm: 2 } }}>{title}</DialogTitle>
    <DialogContent sx={{ pb: { xs: 1.5, sm: 2 } }}>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions
      sx={{
        pt: 0,
        gap: 1,
        flexDirection: { xs: 'column', sm: 'row' },
        '& .MuiButton-root': {
          width: { xs: '100%', sm: 'auto' },
          minWidth: { sm: 120 },
        },
      }}
    >
      <Button
        onClick={onClose}
        color={cancelButtonColor}
        variant={cancelButtonVariant}
        autoFocus={autoFocusButton === 'cancel'}
      >
        {cancelText}
      </Button>
      <Button
        onClick={onConfirm}
        color={confirmButtonColor}
        variant={confirmButtonVariant}
        autoFocus={autoFocusButton === 'confirm'}
      >
        {confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmationDialog;
