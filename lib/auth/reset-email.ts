export function passwordResetUrl(token: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://aibuilders.lat";
  const url = new URL("/reset-password", configured);
  url.searchParams.set("token", token);
  return url.toString();
}

export function passwordResetEmail(url: string): {
  subject: string;
  text: string;
  html: string;
} {
  return {
    subject: "Restablece tu contraseña de AI Builders Latam",
    text: [
      "Recibimos una solicitud para restablecer la contraseña de tu cuenta de administrador.",
      "",
      `Elige una nueva contraseña: ${url}`,
      "",
      "Este enlace vence en una hora y solo se puede usar una vez.",
      "Si no solicitaste este cambio, puedes ignorar este correo.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#202020;line-height:1.6">
        <h1 style="font-size:24px;line-height:1.25">Restablece tu contraseña</h1>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de administrador.</p>
        <p style="margin:28px 0">
          <a href="${url}" style="display:inline-block;border-radius:999px;background:#111;color:#fff;padding:13px 22px;text-decoration:none">Elegir nueva contraseña</a>
        </p>
        <p>Este enlace vence en una hora y solo se puede usar una vez.</p>
        <p style="color:#666">Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `.trim(),
  };
}
