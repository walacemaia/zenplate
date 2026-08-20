import type { Profile } from '@backend/icp_app_backend.did';

import { Principal } from '@icp-sdk/core/principal';

import { icpOpt, tsNullable } from 'src/icpadapters/IcpAdapter';

export type ProfileType = {
  id: bigint;
  lastChange: bigint;
  userName: string;
  displayName: string | null;
  userBio: string | null;
  principal: string;
  language: string;
  avatar: string | null;
  email: string | null;
  country: string | null;
  role: string;
  isController: boolean | null;
};

export const BLANK_PROFILE: ProfileType = {
  id: 0n,
  lastChange: 0n,
  userName: '',
  displayName: '',
  userBio: '',
  principal: Principal.anonymous().toText(),
  language: 'en',
  avatar: null,
  email: null,
  country: null,
  role: 'user',
  isController: null,
};

// Helpers para converter o variant de status <-> string
type ProfileRoleVariant = Profile['role'];
const variantKey = (v: Record<string, unknown>): string => Object.keys(v)[0] || '';
const toVariant = (key: string): ProfileRoleVariant =>
  ({ [key]: null }) as unknown as ProfileRoleVariant;

/* -------------------------------------------------------------------------- */
/*                                 Conversões                                 */
/* -------------------------------------------------------------------------- */
function arrayBufferToBase64(buffer: Uint8Array | number[]): string {
  return btoa(new Uint8Array(buffer).reduce((acc, byte) => acc + String.fromCharCode(byte), ''));
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function icpToTs(m: Profile): ProfileType {
  return {
    id: m.id,
    lastChange: m.lastChange,
    userName: m.userName,
    displayName: tsNullable(m.displayName),
    userBio: tsNullable(m.userBio),
    principal: m.principal.toText(),
    language: Object.keys(m.language)[0],
    avatar: m.avatar.length > 0 && m.avatar[0] ? arrayBufferToBase64(m.avatar[0]) : null,
    email: tsNullable(m.email),
    country: tsNullable(m.country),
    role: variantKey(m.role),
    isController: tsNullable(m.isController),
  };
}
export function tsToIcp(data: ProfileType): Profile {
  return {
    id: data.id,
    lastChange: 0n,
    userName: data.userName,
    displayName: icpOpt(data.displayName),
    userBio: icpOpt(data.userBio),
    principal: Principal.fromText(data.principal),
    language: { [data.language]: null },
    avatar: data.avatar ? [base64ToUint8Array(data.avatar)] : [],
    email: icpOpt(data.email),
    country: icpOpt(data.country),
    role: toVariant(data.role),
    // isController e derivado em runtime no backend (view adapter); nunca enviar.
    isController: [],
  } as Profile;
}

export function tsToIcpArray(members: ProfileType[]): Profile[] {
  return members.map((m) => tsToIcp(m));
}

export function icpToTsArray(members: Profile[]): ProfileType[] {
  return members.map((m) => icpToTs(m));
}
