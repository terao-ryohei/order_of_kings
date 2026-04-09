import { HStack, Button, Text } from "@chakra-ui/react";
import { TIER_GENRES, type TierGenre } from "../../lib/tier-types";

type TierGenreFilterProps = {
  selected: TierGenre | null;
  onChange: (genre: TierGenre | null) => void;
};

export function TierGenreFilter({ selected, onChange }: TierGenreFilterProps) {
  return (
    <HStack gap={2} wrap="wrap">
      <Button
        size="sm"
        variant={selected === null ? "solid" : "outline"}
        colorPalette={selected === null ? "yellow" : "gray"}
        onClick={() => onChange(null)}
      >
        <Text fontWeight="bold" color={selected === null ? "black" : "white"}>
          全て
        </Text>
      </Button>
      {TIER_GENRES.map((genre) => (
        <Button
          key={genre}
          size="sm"
          variant={selected === genre ? "solid" : "outline"}
          colorPalette={selected === genre ? "yellow" : "gray"}
          onClick={() => onChange(genre)}
        >
          <Text fontWeight="bold" color={selected === genre ? "black" : "white"}>
            {genre}
          </Text>
        </Button>
      ))}
    </HStack>
  );
}
