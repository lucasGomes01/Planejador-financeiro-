/** Returns a list of unmet requirements (empty = ok). */
export function passwordProblems(pw: string): string[] {
  const p: string[] = [];
  if (pw.length < 10) p.push('mínimo de 10 caracteres');
  if (!/[a-z]/.test(pw)) p.push('uma letra minúscula');
  if (!/[A-Z]/.test(pw)) p.push('uma letra maiúscula');
  if (!/\d/.test(pw)) p.push('um número');
  if (!/[^A-Za-z0-9]/.test(pw)) p.push('um símbolo');
  return p;
}
export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
