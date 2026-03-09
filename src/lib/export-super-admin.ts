type SuperAdminExportRow = {
  clinic_name: string;
  slug: string;
  owners: number;
  admins: number;
  professionals: number;
  patients: number;
  month_appointments: number;
  month_no_show: number;
  updated_at: string;
};

type SuperAdminExportPayload = {
  generatedAt: string;
  periodLabel: string;
  totals: {
    clinics: number;
    professionals: number;
    patients: number;
    appointmentsMonth: number;
    noShowMonth: number;
  };
  rows: SuperAdminExportRow[];
};

const toLocalDate = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const escapeCell = (value: string | number) => `"${String(value).replaceAll("\"", "\"\"")}"`;

export const exportSuperAdminCSV = (payload: SuperAdminExportPayload) => {
  const lines: string[] = [];
  lines.push(`Relatorio Super Admin;${payload.periodLabel}`);
  lines.push(`Gerado em;${payload.generatedAt}`);
  lines.push("");
  lines.push("Resumo;Valor");
  lines.push(`Clinicas;${payload.totals.clinics}`);
  lines.push(`Profissionais;${payload.totals.professionals}`);
  lines.push(`Pacientes;${payload.totals.patients}`);
  lines.push(`Consultas no mes;${payload.totals.appointmentsMonth}`);
  lines.push(`No-show no mes;${payload.totals.noShowMonth}`);
  lines.push("");
  lines.push("Clinica;Slug;Owners;Admins;Profissionais;Pacientes;Consultas no mes;No-show no mes;Atualizado em");
  payload.rows.forEach((row) => {
    lines.push(
      [
        escapeCell(row.clinic_name),
        escapeCell(row.slug),
        row.owners,
        row.admins,
        row.professionals,
        row.patients,
        row.month_appointments,
        row.month_no_show,
        escapeCell(toLocalDate(row.updated_at)),
      ].join(";")
    );
  });

  triggerDownload(
    new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    "super-admin-assinantes.csv"
  );
};

export const exportSuperAdminXLS = (payload: SuperAdminExportPayload) => {
  const rows = payload.rows
    .map(
      (row) => `
      <tr>
        <td>${row.clinic_name}</td>
        <td>${row.slug}</td>
        <td>${row.owners}</td>
        <td>${row.admins}</td>
        <td>${row.professionals}</td>
        <td>${row.patients}</td>
        <td>${row.month_appointments}</td>
        <td>${row.month_no_show}</td>
        <td>${toLocalDate(row.updated_at)}</td>
      </tr>`
    )
    .join("");

  const html = `
  <html>
    <head>
      <meta charset="UTF-8" />
    </head>
    <body>
      <h2>Relatorio Super Admin - ${payload.periodLabel}</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Clinica</th>
            <th>Slug</th>
            <th>Owners</th>
            <th>Admins</th>
            <th>Profissionais</th>
            <th>Pacientes</th>
            <th>Consultas no mes</th>
            <th>No-show no mes</th>
            <th>Atualizado em</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
  </html>`;

  triggerDownload(
    new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }),
    "super-admin-assinantes.xls"
  );
};

export const exportSuperAdminDOC = (payload: SuperAdminExportPayload) => {
  const list = payload.rows
    .map(
      (row) =>
        `<li><b>${row.clinic_name}</b> (${row.slug}) - Profissionais: ${row.professionals}, Pacientes: ${row.patients}, Consultas no mes: ${row.month_appointments}</li>`
    )
    .join("");

  const html = `
  <html>
    <head><meta charset="UTF-8" /></head>
    <body style="font-family: Arial, sans-serif;">
      <h1>Relatorio Super Admin</h1>
      <p>Periodo: ${payload.periodLabel}</p>
      <p>Gerado em: ${payload.generatedAt}</p>
      <h2>Resumo</h2>
      <ul>
        <li>Clinicas: ${payload.totals.clinics}</li>
        <li>Profissionais: ${payload.totals.professionals}</li>
        <li>Pacientes: ${payload.totals.patients}</li>
        <li>Consultas no mes: ${payload.totals.appointmentsMonth}</li>
        <li>No-show no mes: ${payload.totals.noShowMonth}</li>
      </ul>
      <h2>Assinantes</h2>
      <ol>${list}</ol>
    </body>
  </html>`;

  triggerDownload(new Blob([html], { type: "application/msword;charset=utf-8" }), "super-admin-assinantes.doc");
};

export const exportSuperAdminPDF = (payload: SuperAdminExportPayload) => {
  const rows = payload.rows
    .map(
      (row) => `
      <tr>
        <td>${row.clinic_name}</td>
        <td>${row.professionals}</td>
        <td>${row.patients}</td>
        <td>${row.month_appointments}</td>
        <td>${row.month_no_show}</td>
      </tr>`
    )
    .join("");

  const html = `
  <html>
    <head>
      <title>Relatorio Super Admin</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { margin-bottom: 4px; }
        p { margin-top: 0; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
        th { background: #f5f5f5; }
      </style>
    </head>
    <body>
      <h1>Relatorio Super Admin</h1>
      <p>Periodo: ${payload.periodLabel} | Gerado em: ${payload.generatedAt}</p>
      <table>
        <thead>
          <tr>
            <th>Clinica</th>
            <th>Profissionais</th>
            <th>Pacientes</th>
            <th>Consultas no mes</th>
            <th>No-show no mes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
  </html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
