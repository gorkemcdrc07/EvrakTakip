// src/components/ModernSummary.js
import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];

export default function ModernSummary({
    title = "Açıklama Dağılımı",
    data = [],                // [{ name, value }]
    total = 0,
    onCardClick,              // function(label)
}) {
    const sorted = useMemo(
        () => [...data].sort((a, b) => b.value - a.value),
        [data]
    );

    // En yüksek
    const top = sorted[0];

    const handleClick = (label) => {
        if (onCardClick) onCardClick(label);
    };

    return (
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                    <span role="img" aria-label="chart">📊</span>
                    {title}
                </h4>
                {/* İstersen bir 'Detay' butonu koyabilirsin */}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-center">
                {/* Sol: halka grafik + ortada metrik */}
                <div className="relative h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={sorted}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={2}
                                onClick={(entry) => handleClick(entry.name)} // DİLİM TIKLANIR
                            >
                                {sorted.map((entry, i) => (
                                    <Cell
                                        key={`cell-${entry.name}-${i}`}
                                        fill={COLORS[i % COLORS.length]}
                                        style={{ cursor: "pointer" }}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(v, n) => [`${v} sefer`, n]}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Orta yazı */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        {top ? (
                            <>
                                <div className="text-xs opacity-70">EN YÜKSEK</div>
                                <div className="text-center font-extrabold text-xl sm:text-2xl leading-tight">
                                    {top.name}
                                </div>
                                <div className="text-sm opacity-80 mt-1">
                                    {top.value.toLocaleString("tr-TR")} sefer
                                </div>
                            </>
                        ) : (
                            <div className="opacity-60 text-sm">Veri yok</div>
                        )}
                    </div>
                </div>

                {/* Sağ: tıklanabilir kartlar / legend */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sorted.map((item, i) => (
                        <button
                            key={item.name}
                            onClick={() => handleClick(item.name)}   // KART TIKLANIR
                            className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className="inline-block w-2.5 h-2.5 rounded-full"
                                    style={{ background: COLORS[i % COLORS.length] }}
                                />
                                <div className="text-sm font-medium">{item.name}</div>
                            </div>
                            <div className="text-sm font-semibold tabular-nums">
                                {item.value.toLocaleString("tr-TR")}
                            </div>
                        </button>
                    ))}

                    {sorted.length === 0 && (
                        <div className="text-sm opacity-70">Gösterilecek veri yok.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
