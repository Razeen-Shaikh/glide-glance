import "server-only";

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] To: ${to}\nSubject: ${subject}\n${html}`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM ?? "Glide Glance <orders@example.com>";
  const result = await resend.emails.send({ from, to, subject, html });
  if (result.error) {
    console.error(result.error);
  }
}

export function orderEmailHtml(input: {
  title: string;
  intro: string;
  orderNumber: string;
  total: string;
  lines: { name: string; quantity: number; price: string }[];
}) {
  const rows = input.lines
    .map(
      (line) =>
        `<tr><td style="padding:8px 0">${line.name} × ${line.quantity}</td><td style="padding:8px 0;text-align:right">${line.price}</td></tr>`,
    )
    .join("");
  return `<div style="font-family:Georgia,serif;color:#1c1917;max-width:560px">
    <p style="letter-spacing:0.18em;font-size:12px">GLIDE GLANCE</p>
    <h1 style="font-weight:500;font-size:28px">${input.title}</h1>
    <p>${input.intro}</p>
    <p>Order <strong>${input.orderNumber}</strong></p>
    <table style="width:100%;border-top:1px solid #e7e5e4">${rows}
      <tr><td style="padding-top:12px"><strong>Total</strong></td><td style="padding-top:12px;text-align:right"><strong>${input.total}</strong></td></tr>
    </table>
  </div>`;
}
