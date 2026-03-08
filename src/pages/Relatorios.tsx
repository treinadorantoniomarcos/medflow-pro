import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  PieChart as PieChartIcon,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useReportData } from "@/hooks/use-reports";
import { exportCSV, exportPDF } from "@/lib/export-reports";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
  "#8b5cf6",
  "#06b6d4",
];

const Relatorios = () => {
  const [monthsBack, setMonthsBack] = useState(0);
  const { dailyCounts, statusCounts, professionalCounts, total, from, to, isLoading } =
    useReportData(monthsBack);

  const monthLabel = format(from, "MMMM yyyy", { locale: ptBR });

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Relatórios</h1>
              <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonthsBack((m) => m + 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-semibold"
              onClick={() => setMonthsBack(0)}
            >
              Mês atual
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonthsBack((m) => Math.max(0, m - 1))}
              disabled={monthsBack === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <KpiCard
            title="Total de Consultas"
            value={total}
            icon={<TrendingUp className="h-4 w-4" />}
            loading={isLoading}
          />
          <KpiCard
            title="Status Diferentes"
            value={statusCounts.data?.length ?? 0}
            icon={<PieChartIcon className="h-4 w-4" />}
            loading={isLoading}
          />
          <KpiCard
            title="Profissionais Ativos"
            value={professionalCounts.data?.length ?? 0}
            icon={<Users className="h-4 w-4" />}
            loading={isLoading}
          />
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily bar chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Consultas por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyCounts.data ?? []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        className="fill-muted-foreground"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                        className="fill-muted-foreground"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        labelFormatter={(label) => `Dia ${label}`}
                      />
                      <Bar
                        dataKey="count"
                        name="Consultas"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Status pie chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (statusCounts.data?.length ?? 0) === 0 ? (
                  <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                    Sem dados no período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={(statusCounts.data ?? []).map((d) => ({
                          ...d,
                          name: statusLabels[d.status] ?? d.status,
                        }))}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                        style={{ fontSize: 10 }}
                      >
                        {(statusCounts.data ?? []).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Professional bar chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Consultas por Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (professionalCounts.data?.length ?? 0) === 0 ? (
                  <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                    Sem dados no período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={professionalCounts.data ?? []}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                        className="fill-muted-foreground"
                      />
                      <YAxis
                        type="category"
                        dataKey="professional_name"
                        tick={{ fontSize: 11 }}
                        width={120}
                        className="fill-muted-foreground"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Consultas"
                        fill="hsl(var(--success))"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

const KpiCard = ({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
}) => (
  <Card className="shadow-soft">
    <CardContent className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        {loading ? (
          <Skeleton className="h-6 w-12 mt-1" />
        ) : (
          <p className="text-xl font-bold text-foreground">{value}</p>
        )}
      </div>
    </CardContent>
  </Card>
);

export default Relatorios;
