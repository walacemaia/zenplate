import type { Theme, Components } from '@mui/material/styles';

// ----------------------------------------------------------------------

const MuiDialog: Components<Theme>['MuiDialog'] = {
  /** **************************************
   * DEFAULT PROPS
   *************************************** */
  defaultProps: {
    /**
     * TODO: Should be removed in MUI next.
     * @see https://github.com/mui/material-ui/issues/43106
     */
    closeAfterTransition: false,
  },
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ theme }) => ({
      [theme.breakpoints.down('sm')]: {
        '& .MuiDialog-container': {
          alignItems: 'flex-end',
        },
        '& .MuiDialog-paper:not(.MuiDialog-paperFullScreen)': {
          margin: 0,
          width: '100%',
          maxWidth: '100%',
          height: 'auto',
          maxHeight: '100dvh',
          borderRadius: `${theme.shape.borderRadius * 2}px ${theme.shape.borderRadius * 2}px 0 0`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      },
    }),
    paper: ({ ownerState, theme }) => ({
      boxShadow: theme.vars.customShadows.dialog,
      borderRadius: theme.shape.borderRadius * 2,
      transition: theme.transitions.create(['margin', 'width', 'height', 'border-radius']),
      ...(!ownerState.fullScreen && { margin: theme.spacing(2) }),
    }),
    paperFullScreen: { borderRadius: 0 },
  },
};

const MuiDialogTitle: Components<Theme>['MuiDialogTitle'] = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(2.5, 3),
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1.5, 2),
        minHeight: 52,
        position: 'sticky',
        top: 0,
        zIndex: 2,
        backgroundColor: theme.vars.palette.background.paper,
        borderBottom: `1px solid ${theme.vars.palette.divider}`,
      },
    }),
  },
};

const MuiDialogContent: Components<Theme>['MuiDialogContent'] = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(0, 3),
      '.MuiDialogTitle-root + &': {
        paddingTop: theme.spacing(2),
      },
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(2.5, 2, 1.25),
        '.MuiDialogTitle-root + &.MuiDialogContent-root': {
          paddingTop: `${theme.spacing(2.5)} !important`,
        },
        overflowY: 'auto',
        flex: '1 1 auto',
        minHeight: 0,
        WebkitOverflowScrolling: 'touch',
        // Grid/Grid2 containers use negative outer margins with spacing.
        // In dialogs this can pull the first field into the header area.
        '& > .MuiGrid2-root.MuiGrid2-container, & > .MuiGrid-root.MuiGrid-container': {
          marginTop: 0,
          marginLeft: 0,
          width: '100%',
        },
        '& .MuiFormControl-root': {
          marginBottom: theme.spacing(0.75),
        },
        '& .MuiFormControl-root:first-of-type, & .MuiTextField-root:first-of-type': {
          marginTop: theme.spacing(0.75),
        },
        '& .MuiCard-root': {
          overflow: 'visible',
        },
      },
    }),
    dividers: ({ theme }) => ({
      borderTop: 0,
      borderBottomStyle: 'dashed',
      paddingBottom: theme.spacing(3),
      [theme.breakpoints.down('sm')]: {
        paddingBottom: theme.spacing(2),
      },
    }),
  },
};

const MuiDialogActions: Components<Theme>['MuiDialogActions'] = {
  /** **************************************
   * DEFAULT PROPS
   *************************************** */
  defaultProps: { disableSpacing: true },

  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(3),
      '& > :not(:first-of-type)': { marginLeft: theme.spacing(1.5) },
      [theme.breakpoints.up('sm')]: {
        '& .MuiButton-root': {
          width: 'auto',
          flex: '0 0 auto',
        },
        '& .MuiButton-root.MuiButton-fullWidth': {
          width: 'auto',
          flex: '0 0 auto',
        },
      },
      [theme.breakpoints.down('sm')]: {
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        backgroundColor: theme.vars.palette.background.paper,
        borderTop: `1px solid ${theme.vars.palette.divider}`,
        padding: theme.spacing(1.5, 2, 2),
        paddingBottom: `calc(${theme.spacing(2)} + env(safe-area-inset-bottom))`,
        '& .MuiButton-root': {
          flex: '1 1 0',
          width: '100%',
        },
      },
    }),
  },
};

// ----------------------------------------------------------------------

export const dialog = {
  MuiDialog,
  MuiDialogTitle,
  MuiDialogContent,
  MuiDialogActions,
};
