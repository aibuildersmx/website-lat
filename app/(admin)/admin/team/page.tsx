import { getUser } from "@/lib/auth";
import {
  inviteTeamMember,
  listTeamMembers,
  removeTeamMember,
  resetTeamMemberPassword,
} from "@/lib/actions/team";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, string> = {
  "invalid-email": "Ingresa un correo válido.",
  "weak-password": "La contraseña temporal debe tener al menos 10 caracteres.",
  saved: "Acceso guardado. Comparte la contraseña temporal por un canal seguro.",
  "password-reset": "Contraseña actualizada. Las sesiones activas de esa persona se cerraron.",
  removed: "Acceso removido.",
  "cannot-remove-self": "No puedes remover tu propio acceso.",
  "last-admin": "Debe existir al menos otro administrador antes de remover accesos.",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[11px] font-medium uppercase tracking-normal text-gray-400 dark:text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-black/30 dark:border-white/15 dark:bg-neutral-950 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-white/35"
    />
  );
}

function Button({
  tone = "primary",
  children,
}: {
  tone?: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}) {
  const classes = {
    primary:
      "bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200",
    secondary:
      "border border-black/10 text-gray-700 hover:border-black/25 dark:border-white/15 dark:text-gray-200 dark:hover:border-white/30",
    danger:
      "border border-red-200 text-red-600 hover:border-red-300 dark:border-red-500/30 dark:text-red-400 dark:hover:border-red-500/50",
  };
  return (
    <button
      type="submit"
      className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-normal transition ${classes[tone]}`}
    >
      {children}
    </button>
  );
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [members, currentUser, params] = await Promise.all([
    listTeamMembers(),
    getUser(),
    searchParams,
  ]);
  const status = params.status ? STATUS_COPY[params.status] : null;

  return (
    <div>
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Admin</p>
        <h1 className="mt-1 text-3xl font-medium text-gray-800 dark:text-gray-100">Equipo</h1>
      </div>

      {status && (
        <div className="mt-6 rounded-2xl border border-black/5 bg-white px-5 py-4 text-sm text-gray-600 dark:border-white/10 dark:bg-neutral-900 dark:text-gray-300">
          {status}
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Invitar</p>
          <h2 className="mt-1 text-lg font-medium text-gray-800 dark:text-gray-100">
            Crear acceso de administrador
          </h2>
        </div>
        <form action={inviteTeamMember} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Correo">
            <Input name="email" type="email" placeholder="colaborador@empresa.com" required />
          </Field>
          <Field label="Contraseña temporal">
            <Input
              name="password"
              type="password"
              minLength={10}
              placeholder="Mínimo 10 caracteres"
              required
            />
          </Field>
          <Button>Guardar acceso</Button>
        </form>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-neutral-900">
        <div className="border-b border-black/5 px-5 py-4 dark:border-white/10">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Accesos activos</p>
        </div>
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {members.map((member) => (
            <li key={member.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_20rem_auto] lg:items-center">
              <div className="min-w-0">
                <p className="truncate text-base font-medium text-gray-800 dark:text-gray-100">
                  {member.email}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {member.role} · creado {member.createdAt.toLocaleDateString("es-MX")}
                  {member.id === currentUser?.id ? " · tú" : ""}
                </p>
              </div>

              <form
                action={resetTeamMemberPassword.bind(null, member.id)}
                className="grid gap-2 sm:grid-cols-[1fr_auto]"
              >
                <Input
                  name="password"
                  type="password"
                  minLength={10}
                  placeholder="Nueva contraseña temporal"
                  required
                />
                <Button tone="secondary">Reset</Button>
              </form>

              <form action={removeTeamMember.bind(null, member.id)}>
                <Button tone="danger">Remover</Button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
