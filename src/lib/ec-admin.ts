/**
 * Admin do painel /checkout: o usuário cujo nome bate com ADMIN_USERNAME
 * (padrão 'foster', o mesmo do setup-production.js). Mesma regra do /api/ec/me.
 */
export function isEcAdmin(username: string | null | undefined): boolean {
  return !!username && username === (process.env.ADMIN_USERNAME || 'foster')
}
