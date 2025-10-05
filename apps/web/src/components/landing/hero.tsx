import { SimpleRankingChart } from "@/components/simple-ranking-chart";
import { Button } from "@/components/ui/button";
import { TextLoop } from "@/components/ui/text-loop";
import ModelIcon from "assets/icons/model-icon";
import { ArrowUpRightIcon } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

const ctaModels = [
  {
    icon: <ModelIcon tag="openai:gpt-4o" size="lg" />,
    name: <p className="text-foreground">ChatGPT</p>,
  },
  {
    icon: <ModelIcon tag="google:gemini-2.0-flash" size="lg" />,
    name: (
      <p className="bg-gradient-to-tr from-[#1C7DFF] via-[#1C69FF] to-[#F0DCD6] via-50% text-transparent bg-clip-text">
        Gemini
      </p>
    ),
  },
  {
    icon: <ModelIcon tag="perplexity:perplexity-1" size="xl" />,
    name: <p className="text-[#20808d]">Perplexity</p>,
  },
  {
    icon: <ModelIcon tag="anthropic:claude-3-7-sonnet" size="lg" />,
    name: <p className="text-[#D97757]">Claude</p>,
  },
];

export const Hero = () => {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 gap-8 items-center">
          <div className="flex flex-col">
            <h1 className="text-5xl font-medium leading-tight">
              Apareça para seus
              <br />
              <div className="flex gap-4">
                <p>clientes no</p>
                <TextLoop
                  className="text-primary hidden md:inline-flex"
                  transition={{ duration: 0.3 }}
                  interval={3.5}
                >
                  {ctaModels.map((model, index) => (
                    <div className="flex items-center gap-2.5" key={index}>
                      {model.icon}
                      {model.name}
                    </div>
                  ))}
                </TextLoop>
              </div>
            </h1>
            <p className="text-muted-foreground mt-4 text-lg max-w-xl">
              Descubra como sua marca é citada, compare com concorrentes e
              otimize sua presença nas IAs mais usadas do mundo.
            </p>
            <div className="flex gap-4 mt-8">
              <Button size="lg" className="w-fit">
                Agende uma demo
                <ArrowUpRightIcon
                  className="size-3.5 mt-0.5"
                  strokeWidth={2.5}
                />
              </Button>

              <Button variant="outline" size="lg" className="w-fit">
                Sign In with GitHub
              </Button>
            </div>
          </div>

          <motion.div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 justify-end">
              <p className="text-lg">Qual o melhor banco para abrir conta?</p>
              <Image
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="Random person"
                width={90}
                height={90}
                className="rounded-full object-cover size-6"
              />
            </div>
            <SimpleRankingChart />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
