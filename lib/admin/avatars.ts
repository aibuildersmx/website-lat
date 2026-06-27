// Maps an admin's email to their team avatar + display name. Photos live in
// /public and are the same ones used on the homepage team section
// (components/team.tsx). Unknown emails fall back to an initial in the shell.
export interface AdminIdentity {
  name: string;
  avatar: string;
}

const IDENTITIES: Record<string, AdminIdentity> = {
  "ricgarcas@gmail.com": { name: "Ricardo García", avatar: "/ricardo.avif" },
  "1996byk@gmail.com": { name: "Ben Kim", avatar: "/ben.avif" },
  "momillo@gmail.com": { name: "Javier Rivero", avatar: "/javier.avif" },
};

export function identityForEmail(email: string): AdminIdentity | null {
  return IDENTITIES[email.trim().toLowerCase()] ?? null;
}
