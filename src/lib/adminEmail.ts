// Source unique pour l'identification de l'admin de l'app (Actualités) —
// importé à la fois par instant.perms.ts (règle isAppAdmin) et par l'UI
// (news.tsx, pour n'afficher le bouton "+" qu'à cet email). Pas de
// profiles.isAppAdmin ni de système de rôles : un seul admin possible pour
// l'instant, comparaison directe de l'email authentifié.
export const ADMIN_EMAIL = "mb.patrickdegrace@gmail.com";
