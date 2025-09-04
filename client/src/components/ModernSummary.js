import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

/**
 * ModernSummary (Pro)
 * - Drop-in upgrade for your existing ModernSummary component.
 * - API-compatible: { title, data: [{name, value}], total, onCardClick }
 * - Extras: elegant gradients, percentages, keyboard & a11y, empty/loading states, subtle motion.
 */

const DEFAULT_COLORS = [
    "#10b981", // emerald
    "#3b82f6", // blue
    "#f59e0b", // amber
    "#ef4444", // red
    "#a855f7", // purple
    "#06b6d4", // cyan
    "#22c55e", // green
    "#eab308", // yellow
];

export default function ModernSummary({
    title = "Açıklama Dağılımı",
    data = [], // [{ name, value }]
    total = 0,
    onCardClick, // function(label)
    colors = DEFAULT_COLORS,
    loading = false,
    className = "",
}) {
    const safeData = Array.isArray(data) ? data.filter(Boolean) : [];

    const sorted = useMemo(
        () => [...safeData].sort((a, b) => (b?.value || 0) - (a?.value || 0)),
        [safeData]
    );

    const sum = useMemo(
        () => sorted.reduce((acc, cur) => acc + (Number(cur.value) || 0), 0),
        [sorted]
    );

    const grandTotal = Number(total) > 0 ? Number(total) : sum;
    const top = sorted[0];

    const handleClick = (label) => {
        if (onCardClick) onCardClick(label);
    };

    const empty = !loading && sorted.length === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={
                "rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60 backdrop-blur p-6 shadow-sm hover:shadow-md transition-shadow " +
                className
            }
            role="region"
            aria-label={title}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                    <span role="img" aria-label="chart">📊</span>
                    <span className="truncate max-w-[70vw]">{title}</span>
                </h4>
                {top ? (
                    <div className="hidden sm:flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        En yüksek: <strong className="ml-1">{top.name}</strong>
                    </div>
                ) : null}
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-center">
                {/* Left: Donut chart */}
                <div className="relative h-[280px]">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-emerald-500/5 to-fuchsia-500/5 pointer-events-none" />

                    {loading ? (
                        <div className="animate-pulse h-full w-full rounded-xl bg-gray-100 dark:bg-gray-700" />
                    ) : empty ? (
                        <EmptyState />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <defs>
                                    {sorted.map((_, i) => (
                                        <linearGradient
                                            key={`grad-${i}`}
                                            id={`grad-${i}`}
                                            x1="0%"
                                            y1="0%"
                                            x2="100%"
                                            y2="100%"
                                        >
                                            <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.85} />
                                            <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={1} />
                                        </linearGradient>
                                    ))}
                                </defs>

                                <Pie
                                    data={sorted}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={75}
                                    outerRadius={115}
                                    paddingAngle={2.5}
                                    cornerRadius={6}
                                    onClick={(entry) => handleClick(entry.name)}
                                    isAnimationActive
                                >
                                    {sorted.map((entry, i) => (
                                        <Cell
                                            key={`cell-${entry.name}-${i}`}
                                            fill={`url(#grad-${i})`}
                                            style={{ cursor: "pointer" }}
                                        />
                                    ))}
                                </Pie>

                                <Tooltip
                                    content={<CustomTooltip total={grandTotal} />}
                                    cursor={{ fill: "transparent" }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}

                    {/* Center metric */}
                    {!empty && !loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="text-center font-extrabold text-3xl sm:text-4xl leading-tight">
                                {Number(grandTotal || 0).toLocaleString("tr-TR")}
                            </div>
                            <div className="text-xs uppercase tracking-wider opacity-60">Toplam</div>
                        </div>
                    )}
                </div>

                {/* Right: interactive legend cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {loading ? (
                        <LegendSkeleton />
                    ) : empty ? (
                        <div className="text-sm opacity-70">Gösterilecek veri yok.</div>
                    ) : (
                        sorted.map((item, i) => {
                            const pct = grandTotal > 0 ? (item.value / grandTotal) * 100 : 0;
                            return (
                                <motion.button
                                    key={item.name}
                                    onClick={() => handleClick(item.name)}
                                    className="group flex flex-col gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    aria-label={`${item.name} – ${item.value}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span
                                                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ background: colors[i % colors.length] }}
                                                aria-hidden
                                            />
                                            <div className="text-sm font-medium truncate">{item.name}</div>
                                        </div>
                                        <div className="text-sm font-semibold tabular-nums whitespace-nowrap">
                                            {Number(item.value).toLocaleString("tr-TR")}
                                        </div>
                                    </div>

                                    {/* Percentage bar */}
                                    <div className="h-1.5 w-full rounded-full bg-gray-200/70 dark:bg-gray-700/70 overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${pct.toFixed(2)}%`,
                                                background: `linear-gradient(90deg, ${colors[i % colors.length]}80, ${colors[i % colors.length]})`,
                                            }}
                                        />
                                    </div>

                                    <div className="text-[10px] uppercase tracking-wider opacity-60">
                                        {pct.toFixed(1)}%
                                    </div>
                                </motion.button>
                            );
                        })
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function CustomTooltip({ active, payload, label, total }) {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const name = p?.name ?? p?.payload?.name;
    const value = Number(p?.value || 0);
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 shadow-sm text-xs">
            <div className="font-semibold">{name}</div>
            <div className="tabular-nums">{value.toLocaleString("tr-TR")} sefer</div>
            <div className="opacity-70">%{pct.toFixed(1)}</div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2">
            <div className="text-4xl">🗂️</div>
            <div className="font-semibold">Veri bulunamadı</div>
            <div className="text-sm opacity-70 max-w-[22rem]">
                Görselleştirme için veri sağlayın veya filtreleri gevşetin.
            </div>
        </div>
    );
}

function LegendSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/60">
                    <div className="animate-pulse h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
                    <div className="animate-pulse h-1.5 w-full rounded bg-gray-200 dark:bg-gray-700" />
                </div>
            ))}
        </div>
    );
}