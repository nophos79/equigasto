import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, Wallet, PlusCircle, ArrowUpRight } from 'lucide-react';
import { Card } from '../common/Card';
import { formatCurrency } from '../../core/money';
import type { Group, Movement } from '../../core/types';

interface PersonalExpensesWidgetProps {
  groups: Group[];
  movements: Movement[];
  onOpenCreateGroup?: () => void;
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

  // Cálculos estadísticos
  const totalCents = useMemo(
    () => filteredMovements.reduce((acc, m) => acc + m.amountCents, 0),
    [filteredMovements]
  );

  const averageCents = useMemo(
    () => (filteredMovements.length > 0 ? Math.round(totalCents / filteredMovements.length) : 0),
    [totalCents, filteredMovements.length]
  );

  // Desglose por grupo en el período
  const breakdownByGroup = useMemo(() => {
    return personalGroups.map((grp) => {
      const groupMovs = filteredMovements.filter((m) => m.groupId === grp.id);
      const groupTotal = groupMovs.reduce((acc, m) => acc + m.amountCents, 0);
      return {
        group: grp,
        count: groupMovs.length,
        totalCents: groupTotal,
      };
    });
  }, [personalGroups, filteredMovements]);

  // Si no hay ningún grupo individual creado todavía, mostramos tarjeta sugerencia compacta
  if (personalGroups.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white border border-indigo-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl shrink-0 mt-0.5">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Control de Gastos Personales (Uso individual)</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                ¿Quieres registrar tus presupuestos y gastos propios sin mezclarlos con deudas compartidas? Puedes crear un <strong>Espacio individual (1 persona)</strong> desde Mis Grupos.
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
    <Card className="border border-indigo-100 bg-white space-y-4">
      {/* Cabecera del cuadro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Control de Gastos Personales</h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                Uso individual
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gastos propios asumidos al 100% por ti (no generan deudas con otros).
            </p>
          </div>
        </div>

        {/* Selector de período: Mes / Año / Todo */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0 self-start sm:self-auto">
          {(['month', 'year', 'all'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                period === p
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p === 'month' ? 'Mes' : p === 'year' ? 'Año' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas del período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100/70">
          <span className="text-xs font-semibold text-indigo-800">Total gastado ({periodLabels[period]})</span>
          <p className="text-2xl font-black text-indigo-900 mt-1">
            {formatCurrency(totalCents)}
          </p>
          <span className="text-[11px] text-indigo-600 font-medium">
            {filteredMovements.length} {filteredMovements.length === 1 ? 'gasto registrado' : 'gastos registrados'}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
          <span className="text-xs font-semibold text-slate-600">Media por gasto</span>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {formatCurrency(averageCents)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Promedio en el período</span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
          <span className="text-xs font-semibold text-slate-600">Espacios individuales</span>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {personalGroups.length}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Grupos de 1 persona</span>
        </div>
      </div>

      {/* Desglose por grupo individual */}
      <div className="pt-2">
        <span className="text-xs font-semibold text-slate-600 block mb-2">Desglose por espacio:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {breakdownByGroup.map(({ group, count, totalCents: grpCents }) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl p-1 bg-white rounded-lg border border-slate-200 shrink-0">
                  {group.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate">
                    {group.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {count} {count === 1 ? 'registro' : 'registros'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-1.5 pl-2">
                <span className="text-xs font-extrabold text-slate-900">
                  {formatCurrency(grpCents)}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
};
