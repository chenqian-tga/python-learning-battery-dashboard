"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Gauge, Thermometer, Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SensorCardProps = {
  label: "Temperature" | "Pressure" | "Humidity";
  value: string;
  unit: string;
  trend: string;
  status: "stable" | "warning" | "optimal";
};

const iconMap = {
  Temperature: Thermometer,
  Pressure: Gauge,
  Humidity: Waves,
};

const badgeMap = {
  stable: "bg-white/10 text-white/80",
  warning: "bg-[rgba(112,0,255,0.22)] text-white",
  optimal: "bg-[rgba(0,240,255,0.18)] text-cyan-200",
};

export function SensorCard({
  label,
  value,
  unit,
  trend,
  status,
}: SensorCardProps) {
  const Icon = iconMap[label];

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="glass-panel rounded-xl border-white/10 bg-white/5 text-white">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <Badge className={cn("border-0 capitalize", badgeMap[status])}>
              {status}
            </Badge>
            <CardTitle className="text-sm font-medium tracking-wide text-white/72">
              {label}
            </CardTitle>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-cyan-300">
            <Icon className="size-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-semibold leading-none">{value}</span>
            <span className="pb-1 text-sm text-white/60">{unit}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-white/56">
            <span>Live trend</span>
            <span className="flex items-center gap-1 text-cyan-300">
              <ArrowUpRight className="size-4" />
              {trend}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
