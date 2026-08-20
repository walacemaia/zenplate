import React, { type ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import useTheme from '@mui/material/styles/useTheme';
import useMediaQuery from '@mui/material/useMediaQuery';

export type EntityField = {
  label: string;
  value: ReactNode;
  expand?: boolean;
  colSpan?: {
    xs?: number;
    sm?: number;
    md?: number;
  };
};

type EntityRecordCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  fields: EntityField[];
  actions: ReactNode;
  fieldsLayout?: 'stack' | 'form';
};

export default function EntityRecordCard({
  title,
  subtitle,
  fields,
  actions,
  fieldsLayout = 'stack',
}: EntityRecordCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getTextFromNode = (node: ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }

    if (Array.isArray(node)) {
      return node.map(getTextFromNode).join(' ').trim();
    }

    if (React.isValidElement<{ children?: ReactNode }>(node)) {
      return getTextFromNode(node.props.children);
    }

    return '';
  };

  const normalizedActions = React.Children.map(actions, (actionNode) => {
    if (!React.isValidElement<Record<string, unknown>>(actionNode)) {
      return actionNode;
    }

    const label = getTextFromNode(actionNode.props.children as ReactNode).trim();
    if (!label) {
      return actionNode;
    }

    const actionWithHint = React.cloneElement(actionNode, {
      title: actionNode.props.title ?? label,
      'aria-label': actionNode.props['aria-label'] ?? label,
      ...(isMobile
        ? {
            variant: actionNode.props.variant ?? 'outlined',
          }
        : {}),
    });

    if (!isMobile) {
      return actionWithHint;
    }

    return (
      <Tooltip title={label} enterTouchDelay={0}>
        <span>{actionWithHint}</span>
      </Tooltip>
    );
  });

  const fieldGridColumn = (field: EntityField) => {
    if (field.expand) {
      return { xs: '1 / -1', sm: '1 / -1', md: '1 / -1' };
    }

    const xs = field.colSpan?.xs ?? 1;
    const sm = field.colSpan?.sm ?? 3;
    const md = field.colSpan?.md ?? sm;

    return {
      xs: `span ${xs}`,
      sm: `span ${sm}`,
      md: `span ${md}`,
    };
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        bgcolor: 'background.paper',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ pb: 1.5, flexGrow: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>

        {subtitle && (
          <Typography component="div" variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}

        {fieldsLayout === 'form' ? (
          <Box
            sx={{
              mt: 1.75,
              display: 'grid',
              gap: 1.25,
              gridTemplateColumns: {
                xs: 'repeat(1, minmax(0, 1fr))',
                sm: 'repeat(6, minmax(0, 1fr))',
                md: 'repeat(12, minmax(0, 1fr))',
              },
            }}
          >
            {fields.map((field) => (
              <Stack key={field.label} spacing={0.25} sx={{ gridColumn: fieldGridColumn(field) }}>
                <Typography variant="caption" color="text.secondary">
                  {field.label}
                </Typography>
                <Typography variant="body2">{field.value}</Typography>
              </Stack>
            ))}
          </Box>
        ) : (
          <Stack spacing={1.25} sx={{ mt: 1.75 }}>
            {fields.map((field) => (
              <Stack key={field.label} spacing={0.25}>
                <Typography variant="caption" color="text.secondary">
                  {field.label}
                </Typography>
                <Typography variant="body2">{field.value}</Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>

      <Divider />

      <CardActions
        sx={{
          px: 2,
          py: 1.25,
          justifyContent: 'flex-end',
          gap: 1,
          flexWrap: 'wrap',
          [theme.breakpoints.down('sm')]: {
            '& .MuiButton-root': {
              minWidth: 36,
              width: 36,
              height: 36,
              padding: 0,
              fontSize: 0,
              borderRadius: 1,
              backgroundColor: theme.vars.palette.action.hover,
            },
            '& .MuiButton-root:hover': {
              backgroundColor: theme.vars.palette.action.selected,
            },
            '& .MuiButton-startIcon': {
              margin: 0,
            },
            '& .MuiButton-endIcon': {
              margin: 0,
            },
          },
        }}
      >
        {normalizedActions}
      </CardActions>
    </Card>
  );
}
