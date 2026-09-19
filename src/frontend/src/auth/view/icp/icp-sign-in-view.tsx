/**
 * PADRÃO APLICATIVO — implementação de referência da tela de entrada.
 *
 * Destino no projeto consumidor:
 *   src/frontend/src/auth/view/icp/icp-sign-in-view.tsx
 *
 * Este arquivo é o estado de quem cumpre TODOS os requisitos da seção 5 da
 * SKILL.md. Requisito novo que mexa nele o atualiza junto (SKILL.md, seção 10).
 *
 * Origem: Elysium. Em relação ao que está lá hoje, nada muda visualmente — as
 * cores e os textos saem do JSX para os blocos PALETTE e TEXTS, e os heros
 * passam a se chamar pelo que de fato carregam (no Elysium os nomes estavam
 * trocados; o comportamento sempre esteve certo, só a nomenclatura enganava).
 *
 * AO APLICAR: preencha os blocos PALETTE e TEXTS. Não mexa na estrutura de
 * layout — é ela que define o padrão.
 */

import { useState } from 'react';

import { useTheme } from '@mui/material/styles';
import LoginIcon from '@mui/icons-material/Login';
import {
  Box,
  Paper,
  Stack,
  Button,
  Checkbox,
  Typography,
  useMediaQuery,
  FormControlLabel,
} from '@mui/material';

import { CONFIG } from 'src/global-config';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

// ----------------------------------------------------------------------
// PALETTE — os únicos valores que variam entre aplicações do padrão.
// Os defaults abaixo são os do Elysium; troque pelos da marca do projeto.
// ----------------------------------------------------------------------

const PALETTE = {
  pageBackground: '#eef0f8', // fundo atrás do cartão
  cardBackground: '#fff',
  border: '#dfe2ef',
  heroBackground: '#110F3A', // cor sob a imagem enquanto ela carrega — o índigo profundo da própria cena
  action: '#635BFF', // botão de login — primary.main do tema
  eyebrowText: '#6b6f8f', // eyebrow (linha curta em caixa alta)
  titleText: '#1f2140',
  subtitleText: '#5f6480',
  labelText: '#626880', // label do "lembrar de mim"
  footnoteText: '#6f7590',
  checkbox: '#8b90a8',
};

// Pilha honesta: é o que de fato renderiza. Declarar Fraunces sem carregá-la
// faria o título cair em Georgia silenciosamente. Um projeto derivado que
// queira outra fonte carrega a sua e troca esta linha.
const TITLE_FONT = 'Georgia, serif';

// ----------------------------------------------------------------------
// TEXTS — preencher por aplicação.
// ----------------------------------------------------------------------

const TEXTS = {
  eyebrow: 'IcpApp — ÁREA PRIVADA',
  title: 'Entre para continuar.',
  subtitle: 'Substitua estes textos pela mensagem real do seu produto.',
  rememberMe: 'Lembrar de mim neste dispositivo',
  button: 'Entrar com Internet Identity',
  footnote: 'O acesso é feito por Internet Identity; nenhuma senha é armazenada aqui.',
  heroAlt: `Ilustração de entrada ${CONFIG.appName}`,
  logoAlt: `Marca ${CONFIG.appName}`,
};

// ----------------------------------------------------------------------
// IMAGENS — caminhos fixos do padrão (ver especificacao-imagens.md).
// ----------------------------------------------------------------------

/** Retrato 4:5 — coluna direita em telas >= md. */
const heroPortrait = `${CONFIG.assetsDir}/assets/illustrations/ilustration-login-vertical.webp`;
/** Paisagem ~12:7 — faixa abaixo do formulário em telas < md. */
const heroLandscape = `${CONFIG.assetsDir}/assets/illustrations/ilustration-login.webp`;
/** Marca completa, sobreposta ao hero e pintada de branco por filtro CSS. */
const heroOverlay = `${CONFIG.assetsDir}/logo/logo-full.svg`;

/** Chave de persistência do "lembrar de mim". Trocar `app` pelo nome do projeto. */
const REMEMBER_ME_STORAGE_KEY = 'icp_app.auth.rememberMe';

// ----------------------------------------------------------------------

export function IcpSignInView() {
  const theme = useTheme();
  const isStacked = useMediaQuery(theme.breakpoints.down('md'));
  const { login } = useIcpContext();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY) === 'true';
  });

  // Empilhado (< md) a imagem vira faixa larga; lado a lado (>= md) ela ocupa
  // uma coluna alta e estreita, e aí o recorte que serve é o retrato.
  const heroSrc = isStacked ? heroLandscape : heroPortrait;

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, checked ? 'true' : 'false');
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login({ rememberMe });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: PALETTE.pageBackground,
        px: { xs: 1.5, sm: 2.5, md: 3.5 },
        py: { xs: 2.5, sm: 3.5, md: 4.5 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          mx: 'auto',
          width: '100%',
          maxWidth: 1120,
          borderRadius: 3,
          border: `1px solid ${PALETTE.border}`,
          overflow: 'hidden',
          bgcolor: PALETTE.cardBackground,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ minHeight: { md: 560, lg: 620 } }}>
          {/* ---------------- Coluna do formulário ---------------- */}
          <Stack
            sx={{
              flex: { md: '0 0 50%' },
              justifyContent: 'center',
              px: { xs: 2.5, sm: 4, md: 5.5, lg: 7 },
              pt: { xs: 3.25, sm: 4.25, md: 5.5 },
              pb: { xs: 3, sm: 4, md: 5.5 },
              gap: { xs: 2.25, sm: 2.5, md: 3 },
            }}
          >
            <Typography
              sx={{
                color: PALETTE.eyebrowText,
                fontSize: { xs: 13, sm: 14 },
                letterSpacing: '0.1em',
                fontWeight: 700,
              }}
            >
              {TEXTS.eyebrow}
            </Typography>

            <Typography
              sx={{
                color: PALETTE.titleText,
                fontFamily: TITLE_FONT,
                fontSize: { xs: 44, sm: 50, md: 56 },
                fontWeight: 200,
                lineHeight: 1.06,
                letterSpacing: '-0.015em',
                maxWidth: { xs: 360, md: 430 },
              }}
            >
              {TEXTS.title}
            </Typography>

            <Typography
              sx={{ color: PALETTE.subtitleText, fontSize: { xs: 17, sm: 20 }, maxWidth: 430 }}
            >
              {TEXTS.subtitle}
            </Typography>

            <Stack sx={{ gap: 1.7, maxWidth: 430 }}>
              <FormControlLabel
                sx={{
                  ml: 0,
                  '& .MuiFormControlLabel-label': {
                    color: PALETTE.labelText,
                    fontSize: { xs: 16, sm: 17 },
                  },
                }}
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => handleRememberMeChange(e.target.checked)}
                    sx={{ color: PALETTE.checkbox }}
                  />
                }
                label={TEXTS.rememberMe}
              />

              <Button
                size="large"
                variant="contained"
                color="inherit"
                startIcon={<LoginIcon />}
                onClick={handleLogin}
                disabled={isLoggingIn}
                /**
                 * O tema Minimals pinta `contained` com um gradiente próprio e
                 * vence a `sx` em vários estados. As repetições de cor e os
                 * `!important` abaixo existem para neutralizar isso — não são
                 * redundância acidental. Se remover, o botão volta a ficar com
                 * o gradiente do tema no hover.
                 */
                sx={{
                  width: 1,
                  height: { xs: 52, sm: 56 },
                  borderRadius: 1.6,
                  bgcolor: PALETTE.action,
                  backgroundColor: PALETTE.action,
                  background: PALETTE.action,
                  color: '#fff !important',
                  fontSize: { xs: 16, sm: 17 },
                  fontWeight: 500,
                  textTransform: 'none',
                  '& .MuiButton-startIcon': { color: '#fff' },
                  '&.MuiButton-contained': {
                    backgroundImage: 'none',
                    backgroundColor: PALETTE.action,
                    color: '#fff !important',
                  },
                  '&:hover': {
                    backgroundImage: 'none',
                    bgcolor: PALETTE.action,
                    backgroundColor: PALETTE.action,
                    background: PALETTE.action,
                    color: '#fff !important',
                    fontWeight: 600,
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(255, 255, 255, 0.72)',
                    // `color-mix` em vez de `opacity`, para não desbotar junto
                    // o rótulo e o ícone — só o fundo perde força.
                    backgroundColor: `color-mix(in srgb, ${PALETTE.action} 56%, transparent)`,
                  },
                }}
              >
                {TEXTS.button}
              </Button>
            </Stack>

            <Typography
              sx={{ color: PALETTE.footnoteText, fontSize: { xs: 16, sm: 17 }, maxWidth: 430 }}
            >
              {TEXTS.footnote}
            </Typography>
          </Stack>

          {/* ---------------- Coluna do hero ---------------- */}
          <Box
            sx={{
              position: 'relative',
              flex: { md: '0 0 50%' },
              minHeight: { xs: 'auto', sm: 'auto', md: 560, lg: 620 },
              borderTop: { xs: `1px solid ${PALETTE.border}`, md: 'none' },
              borderLeft: { xs: 'none', md: `1px solid ${PALETTE.border}` },
              bgcolor: PALETTE.heroBackground,
            }}
          >
            <Box
              component="img"
              src={heroSrc}
              alt={TEXTS.heroAlt}
              sx={{ width: 1, display: 'block', position: 'relative', height: 'auto' }}
            />

            <Box
              component="img"
              src={heroOverlay}
              alt={TEXTS.logoAlt}
              sx={{
                position: 'absolute',
                top: { xs: 18, sm: 22, md: 30 },
                left: { xs: 18, sm: 22, md: 30 },
                width: { xs: 170, sm: 210, md: 260 },
                objectFit: 'contain',
                // pinta a marca de branco, seja qual for a cor do SVG —
                // por isso o logo precisa ser legível como silhueta sólida
                filter: 'brightness(0) invert(1)',
                opacity: 0.9,
              }}
            />
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
