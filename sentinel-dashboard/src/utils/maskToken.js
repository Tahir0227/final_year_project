export function maskToken(token) {
  if (!token || token.length < 8) return '••••••••';
  return token.slice(0, 4) + '••••••••' + token.slice(-4);
}
