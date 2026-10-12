export function sameDict(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  return ak.every((k) => a[k] === b[k]);
}
