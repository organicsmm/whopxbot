import { cn } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/engagement-types";
import { Instagram, Music, Youtube, Twitter, Facebook } from "lucide-react";

interface PlatformSelectorProps {
  selected: string;
  onSelect: (platform: string) => void;
  availablePlatforms?: string[]; // Only show platforms with active bundles
}

const iconMap = {
  Instagram,
  Music,
  Youtube,
  Twitter,
  Facebook,
};

export function PlatformSelector({ selected, onSelect, availablePlatforms }: PlatformSelectorProps) {
  // Filter platforms based on availablePlatforms prop
  const platformsToShow = availablePlatforms
    ? Object.entries(PLATFORM_CONFIG).filter(([key]) => availablePlatforms.includes(key))
    : Object.entries(PLATFORM_CONFIG);

  if (platformsToShow.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No platforms configured. Contact admin to set up engagement bundles.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {platformsToShow.map(([key, config]) => {
        const Icon = iconMap[config.icon as keyof typeof iconMap];
        const isSelected = selected === key;

        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest",
              isSelected
                ? `bg-gradient-to-r ${config.color} text-white border-2 border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] scale-[1.05]`
                : "bg-white/[0.03] text-white/65 border border-white/5 hover:bg-white/5 hover:text-white/80"
            )}
          >
            <Icon className={cn("h-4 w-4", isSelected ? "text-white" : "text-white/80")} />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
