"use client";

import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import ModelIcon from "assets/icons/model-icon";
import Image from "next/image";
import { motion } from "motion/react";
import { Line, LineChart, XAxis, YAxis } from "recharts";

const data = [
  {
    month: "Janeiro",
    Nubank: 3,
    Itaú: 1,
    "C6 Bank": 2,
  },
  {
    month: "Fevereiro",
    Nubank: 2,
    Itaú: 3,
    "C6 Bank": 1,
  },
  {
    month: "Março",
    Nubank: 1,
    Itaú: 2,
    "C6 Bank": 3,
  },
  {
    month: "Abril",
    Nubank: 2,
    Itaú: 1,
    "C6 Bank": 2,
  },
  {
    month: "Maio",
    Nubank: 2,
    Itaú: 1,
    "C6 Bank": 3,
  },
];

const chartConfig = {
  Nubank: {
    label: "Nubank",
    color: "#8106D1",
  },
  Itaú: {
    label: "Itaú",
    color: "#F76002",
  },
  "C6 Bank": {
    label: "C6 Bank",
    color: "#000",
  },
};

export const SimpleRankingChart = () => {
  // Get the last data point to determine final positions
  const lastDataPoint = data[data.length - 1];

  const finalPositions = [
    { name: "Nubank", position: lastDataPoint.Nubank, color: "#8106D1" },
    { name: "Itaú", position: lastDataPoint.Itaú, color: "#F76002" },
    { name: "C6 Bank", position: lastDataPoint["C6 Bank"], color: "#000" },
  ];

  const sortedFinalPositions = finalPositions.sort(
    (a, b) => a.position - b.position
  );

  return (
    <div className="w-full h-[400px] relative">
      <ChartContainer
        config={chartConfig}
        className="w-full h-full border-0 bg-transparent"
      >
        <LineChart
          data={data}
          margin={{ top: 40, right: 100, bottom: 60, left: 0 }}
        >
          <defs>
            <linearGradient
              id="lineGradientNubank"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="5%" stopColor="#AE74D3" stopOpacity={0} />
              <stop offset="25%" stopColor="#AE74D3" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#AE74D3" stopOpacity={1} />
            </linearGradient>
            <linearGradient
              id="lineGradientItau"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="5%" stopColor="#F76002" stopOpacity={0} />
              <stop offset="25%" stopColor="#F76002" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#F76002" stopOpacity={1} />
            </linearGradient>
            <linearGradient
              id="lineGradientC6"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="5%" stopColor="#000" stopOpacity={0} />
              <stop offset="25%" stopColor="#000" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#000" stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={false}
            hide
          />
          <YAxis
            domain={[1, 3]}
            reversed={true}
            axisLine={false}
            tickLine={false}
            tick={false}
            hide
          />
          <ChartTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;

              // Sort companies by their ranking (1st to 3rd place)
              const sortedPayload = [...payload].sort(
                (a, b) => (a.value as number) - (b.value as number)
              );

              return (
                <div className="bg-background/95 backdrop-blur-sm border shadow-lg rounded-lg px-3 py-2">
                  <div className="font-medium text-sm mb-2 flex items-center gap-1">
                    {label} -{"  "}
                    <ModelIcon
                      tag="openai:gpt-4o"
                      className="inline-block"
                      size="xs"
                    />
                    ChatGPT
                  </div>
                  <div className="grid gap-1.5">
                    {sortedPayload.map((item, index) => (
                      <div
                        key={item.dataKey}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-1">
                          {item.name === "Nubank" && (
                            <Image
                              src="/banks/nubank.png"
                              alt="Nubank"
                              width={16}
                              height={16}
                              className="rounded-[3px]"
                            />
                          )}
                          {item.name === "Itaú" && (
                            <Image
                              src="/banks/itau.png"
                              alt="Itaú"
                              width={16}
                              height={16}
                              className="rounded-[3px]"
                            />
                          )}
                          {item.name === "C6 Bank" && (
                            <Image
                              src="/banks/c6.png"
                              alt="C6 Bank"
                              width={16}
                              height={16}
                              className="rounded-[3px]"
                            />
                          )}
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="font-mono font-medium text-sm">
                          #{item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="basis"
            dataKey="Nubank"
            stroke="url(#lineGradientNubank)"
            strokeWidth={4}
            strokeLinecap="round"
            dot={false}
            activeDot={false}
          />
          <Line
            type="basis"
            dataKey="Itaú"
            stroke="url(#lineGradientItau)"
            strokeWidth={4}
            strokeLinecap="round"
            dot={false}
            activeDot={false}
          />
          <Line
            type="basis"
            dataKey="C6 Bank"
            stroke="url(#lineGradientC6)"
            strokeWidth={4}
            strokeLinecap="round"
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ChartContainer>

      {/* Bank labels at the end of lines */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 space-y-28">
        {sortedFinalPositions.map((bank, index) => {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 1.3 }}
              key={bank.name}
              className="flex items-center gap-2 transition-all duration-300"
            >
              <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-2 py-2 rounded-md border shadow">
                {bank.name === "Nubank" && (
                  <Image
                    src="/banks/nubank.png"
                    alt="Nubank"
                    width={20}
                    height={20}
                    className="rounded-[3px]"
                  />
                )}
                {bank.name === "Itaú" && (
                  <Image
                    src="/banks/itau.png"
                    alt="Itaú"
                    width={20}
                    height={20}
                    className="rounded-[3px]"
                  />
                )}
                {bank.name === "C6 Bank" && (
                  <Image
                    src="/banks/c6.png"
                    alt="C6 Bank"
                    width={20}
                    height={20}
                    className="rounded-[3px]"
                  />
                )}
                <span className="text-sm font-medium">{bank.name}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded border ml-1 font-mono font-bold ${
                    bank.position === 1
                      ? "bg-green-500/20 text-green-500 border border-green-500/5"
                      : bank.position === 2
                      ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/5"
                      : "bg-red-500/20 text-red-500 border border-red-500/5"
                  }`}
                >
                  #{bank.position}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
