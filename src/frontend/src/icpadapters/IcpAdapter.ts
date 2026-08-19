export function icpOpt<T>(obj: T | null | undefined): [T] | [] {
  return obj ? [obj] : [];
}

//export function tsNullable<T>(obj:[T] | []): T | null {
//return obj.length==1?obj[0] : null;
//}

export function tsNullable<T>(opt: [T] | [] | null | undefined): T | null {
  return opt && opt.length === 1 ? opt[0] : null;
}

export function tsUndefined<T>(obj: [T] | [] | null | undefined): T | undefined {
  return obj && obj.length == 1 ? obj[0] : undefined;
}
