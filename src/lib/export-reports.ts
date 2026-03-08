import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { StatusCount, ProfessionalCount } from "@/hooks/use-reports";

const statusLabels: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "Em atendimento",
  completed: "Concluída",
  no_show: "No-show",
  cancelled: "Cancelada",
  rescheduled: "Remarcada",
  available: "Disponível",
};

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["\uFEFF" + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ExportData {
  monthLabel: string;
  total: number;
  dailyCounts: { date: string; label: string; count: number }[];
  statusCounts: StatusCount[];
  professionalCounts: ProfessionalCount[];
}

export function exportCSV(data: ExportData) {
  const lines: string[] = [];

  lines.push(`Relatório - ${data.monthLabel}`);
  lines.push(`Total de consultas: ${data.total}`);
  lines.push("");

  // Daily
  lines.push("CONSULTAS POR DIA");
  lines.push("Data;Quantidade");
  data.dailyCounts.forEach((d) => lines.push(`${d.date};${d.count}`));
  lines.push("");

  // Status
  lines.push("DISTRIBUIÇÃO POR STATUS");
  lines.push("Status;Quantidade");
  data.statusCounts.forEach((s) =>
    lines.push(`${statusLabels[s.status] ?? s.status};${s.count}`)
  );
  lines.push("");

  // Professional
  lines.push("CONSULTAS POR PROFISSIONAL");
  lines.push("Profissional;Quantidade");
  data.professionalCounts.forEach((p) =>
    lines.push(`${p.professional_name};${p.count}`)
  );

  const filename = `relatorio-${data.monthLabel.replace(/\s/g, "-")}.csv`;
  downloadFile(lines.join("\n"), filename, "text/csv");
}

export function exportPDF(data: ExportData) {
  const statusRows = data.statusCounts
    .map(
      (s) =>
        `<tr><td>${statusLabels[s.status] ?? s.status}</td><td style="text-align:right">${s.count}</td></tr>`
    )
    .join("");

  const profRows = data.professionalCounts
    .map(
      (p) =>
        `<tr><td>${p.professional_name}</td><td style="text-align:right">${p.count}</td></tr>`
    )
    .join("");

  const dailyRows = data.dailyCounts
    .filter((d) => d.count > 0)
    .map(
      (d) =>
        `<tr><td>${d.date}</td><td style="text-align:right">${d.count}</td></tr>`
    )
    .join("");

  const html = `
    <html>
    <head>
      <title>Relatório - ${data.monthLabel}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin-top: 24px; margin-bottom: 8px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
        .subtitle { font-size: 13px; color: #666; margin-bottom: 20px; }
        .kpi { display: inline-block; background: #f5f5f5; border-radius: 8px; padding: 12px 20px; margin-right: 12px; margin-bottom: 12px; }
        .kpi-value { font-size: 24px; font-weight: 700; }
        .kpi-label { font-size: 11px; color: #888; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 12px; text-align: left; }
        th { font-weight: 600; color: #555; background: #fafafa; }
        .footer { margin-top: 32px; font-size: 10px; color: #aaa; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>Relatório Mensal</h1>
      <p class="subtitle">${data.monthLabel}</p>

      <div>
        <div class="kpi">
          <div class="kpi-value">${data.total}</div>
          <div class="kpi-label">Total de Consultas</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">${data.statusCounts.length}</div>
          <div class="kpi-label">Status Diferentes</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">${data.professionalCounts.length}</div>
          <div class="kpi-label">Profissionais</div>
        </div>
      </div>

      <h2>Distribuição por Status</h2>
      <table>
        <thead><tr><th>Status</th><th style="text-align:right">Qtd</th></tr></thead>
        <tbody>${statusRows}</tbody>
      </table>

      <h2>Consultas por Profissional</h2>
      <table>
        <thead><tr><th>Profissional</th><th style="text-align:right">Qtd</th></tr></thead>
        <tbody>${profRows}</tbody>
      </table>

      <h2>Consultas por Dia</h2>
      <table>
        <thead><tr><th>Data</th><th style="text-align:right">Qtd</th></tr></thead>
        <tbody>${dailyRows}</tbody>
      </table>

      <p class="footer">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — MedFlux Pro</p>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
