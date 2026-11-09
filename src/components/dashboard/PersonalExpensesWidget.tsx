import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, Wallet, PlusCircle, ArrowUpRight, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { Card } from '../common/Card';
import { formatCurrency } from '../../core/money';
import type { Group, Movement } from '../../core/types';

interface PersonalExpensesWidgetProps {
  groups: Group[];
  movements: Movement[];
}

type PeriodFilter = 'month' | 'year' | 'all';

export const PersonalExpensesWidget: React.FC<PersonalExpensesWidgetProps> = ({
  groups,
  movements,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('month');

  // Grupos de uso individual (1 solo miembro)
  const personalGroups = useMemo(
    () => groups.filter((g) => g.members.length === 1),
    [groups]
  );

  const personalGroupIds = useMemo(
    () => new Set(personalGroups.map((g) => g.id)),
    [personalGroups]
  );

  // Filtrar movimientos pertenecientes a grupos individuales
  const personalMovements = useMemo(
    () => movements.filter((m) => personalGroupIds.has(m.groupId)),
    [movements, personalGroupIds]
  );

  // Filtrar por período seleccionado
  const filteredMovements = useMemo(() => {
    if (period === 'all') return personalMovements;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return personalMovements.filter((m) => {
      const d = new Date(m.date);
      if (period === 'year') {
        return d.getFullYear() === currentYear;
      }
      if (period === 'month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      return true;
    });
  }, [personalMovements, period]);

  // Cálculos financieros: Ingresos, Gastos y Balance neto
  const totalIncomeCents = useMemo(
    () =>
      filteredMovements
        .filter((m) => m.type === 'INCOME')
        .reduce((acc, m) => acc + m.amountCents, 0),
    [filteredMovements]
  );

  const totalExpenseCents = useMemo(
    () =>
      filteredMovements
        .filter((m) => m.type !== 'INCOME')
        .reduce((acc, m) => acc + m.amountCents, 0),
    [filteredMovements]
  );

  const netBalanceCents = totalIncomeCents - totalExpenseCents;

  // Desglose por grupo en el período
  const breakdownByGroup = useMemo(() => {
    return personalGroups.map((grp) => {
      const groupMovs = filteredMovements.filter((m) => m.groupId === grp.id);
      const groupIncomes = groupMovs
        .filter((m) => m.type === 'INCOME')
        .reduce((acc, m) => acc + m.amountCents, 0);
      const groupExpenses = groupMovs
        .filter((m) => m.type !== 'INCOME')
        .reduce((acc, m) => acc + m.amountCents, 0);

      return {
        group: grp,
        count: groupMovs.length,
        incomes: groupIncomes,
        expenses: groupExpenses,
        net: groupIncomes - groupExpenses,
      };
    });
  }, [personalGroups, filteredMovements]);

  // Si no hay ningún grupo individual creado todavía, mostramos tarjeta sugerencia compacta
  if (personalGroups.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl shrink-0 mt-0.5">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Control de Finanzas Personales</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                ¿Quieres registrar ingresos y gastos propios sin mezclarlos con deudas compartidas? Puedes crear un <strong>Espacio individual</strong> desde Mis Grupos.
              </p>
            </div>
          </div>
          <Link
            to="/groups"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear espacio individual</span>
          </Link>
        </div>
      </Card>
    );
  }

  const periodLabels: Record<PeriodFilter, string> = {
    month: 'Este mes',
    year: 'Este año',
    all: 'Histórico total',
  };

  return (
    <Card className="border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-slate-900 space-y-4">
      {/* Cabecera del cuadro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Control de Finanzas Personales</h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                Individual
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ingresos y gastos propios asumidos al 100% por ti (no generan deudas con otros).
            </p>
          </div>
        </div>

        {/* Selector de período: Mes / Año / Todo */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 shrink-0 self-start sm:self-auto">
          {(['month', 'year', 'all'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                period === p
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {p === 'month' ? 'Mes' : p === 'year' ? 'Año' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas del período: Ingresos, Gastos y Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Ingresos */}
        <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Ingresos ({periodLabels[period]})</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(totalIncomeCents)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Entradas registradas</span>
        </div>

        {/* Total Gastos */}
        <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
            <span>Gastos ({periodLabels[period]})</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-1">
            {formatCurrency(totalExpenseCents)}
          </p>
          <span className="text-[11px] text-rose-600 font-medium">Salidas y compras</span>
        </div>

        {/* Balance / Ahorro Neto */}
        <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-800">
            <span>Balance neto ({periodLabels[period]})</span>
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p
            className={`text-2xl font-black mt-1 ${
              netBalanceCents >= 0 ? 'text-indigo-900' : 'text-rose-700'
            }`}
          >
            {formatCurrency(netBalanceCents, { showSign: true })}
          </p>
          <span className="text-[11px] text-indigo-600 font-medium">
            {netBalanceCents >= 0 ? 'Ahorro positivo' : 'Gastos superiores a ingresos'}
          </span>
        </div>
      </div>

      {/* Desglose por grupo individual */}
      <div className="pt-1">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">Desglose por espacio:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {breakdownByGroup.map(({ group, count, incomes, expenses }) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                  {group.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                    {group.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {count} {count === 1 ? 'movimiento' : 'movimientos'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-1.5 pl-2">
                <div className="text-right">
                  {incomes > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 block">
                      +{formatCurrency(incomes)}
                    </span>
                  )}
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    {expenses > 0 ? `-${formatCurrency(expenses)}` : '0,00 €'}
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
};
