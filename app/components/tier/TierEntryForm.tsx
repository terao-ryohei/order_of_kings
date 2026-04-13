import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Heading,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  RANK_COLORS,
  TIER_RANKS,
  TIER_GENRES,
  type TierRank,
  type TierGenre,
  type TierEntry,
  type TierWarriorSlot,
} from "../../lib/tier-types";
import { TierSlotEditor } from "./TierSlotEditor";

type WarriorOption = {
  id: number;
  name: string;
  rarity: number;
  uniqueSkillName: string | null;
};

type SkillOption = {
  id: number;
  name: string;
  skill_type: string;
  color: string | null;
  description: string;
};

type TierEntryFormProps = {
  allWarriors: WarriorOption[];
  allSkills: SkillOption[];
  onSave: (entry: Omit<TierEntry, "id" | "created_at" | "updated_at">) => void;
};

const ROLES = ["主将", "副将", "軍師"] as const;

function createEmptySlot(role: "主将" | "副将" | "軍師"): TierWarriorSlot {
  return {
    warrior_id: 0,
    role,
    skills: [],
    alt_warrior_ids: [],
  };
}

export function TierEntryForm({
  allWarriors,
  allSkills,
  onSave,
}: TierEntryFormProps) {
  const [rank, setRank] = useState<TierRank>("S");
  const [genres, setGenres] = useState<TierGenre[]>([]);
  const [slots, setSlots] = useState<
    [TierWarriorSlot, TierWarriorSlot, TierWarriorSlot]
  >([
    createEmptySlot("主将"),
    createEmptySlot("副将"),
    createEmptySlot("軍師"),
  ]);
  const [description, setDescription] = useState("");

  function handleGenreToggle(genre: TierGenre) {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  }

  function handleSlotChange(index: number, newSlot: TierWarriorSlot) {
    setSlots((prev) => {
      const next = [...prev] as [
        TierWarriorSlot,
        TierWarriorSlot,
        TierWarriorSlot,
      ];
      next[index] = newSlot;
      return next;
    });
  }

  function handleSave() {
    const hasWarrior = slots.some((s) => s.warrior_id > 0);
    if (!hasWarrior) return;

    onSave({
      rank,
      genres,
      slots,
      description,
    });
  }

  const isValid = slots.some((s) => s.warrior_id > 0);

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="sm" mb={3}>
          ランク
        </Heading>
        <HStack gap={2}>
          {TIER_RANKS.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={rank === r ? "solid" : "outline"}
              colorPalette={rank === r ? "yellow" : "gray"}
              onClick={() => setRank(r)}
              minW="3rem"
            >
              <Text fontWeight="bold" color={rank === r ? "black" : RANK_COLORS[r].text}>
                {r}
              </Text>
            </Button>
          ))}
        </HStack>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          ジャンル
        </Heading>
        <Flex gap={3} wrap="wrap">
          {TIER_GENRES.map((genre) => (
            <Checkbox.Root
              key={genre}
              checked={genres.includes(genre)}
              onCheckedChange={() => handleGenreToggle(genre)}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Text color="white" fontSize="sm">
                  {genre}
                </Text>
              </Checkbox.Label>
            </Checkbox.Root>
          ))}
        </Flex>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          編成（3スロット）
        </Heading>
        <VStack align="stretch" gap={3}>
          {slots.map((slot, idx) => (
            <TierSlotEditor
              key={ROLES[idx]}
              slot={slot}
              allWarriors={allWarriors}
              allSkills={allSkills}
              onChange={(newSlot) => handleSlotChange(idx, newSlot)}
            />
          ))}
        </VStack>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          説明（任意）
        </Heading>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="編成の解説やポイントを入力..."
          bg="gray.900"
          borderColor="whiteAlpha.300"
          rows={3}
        />
      </Box>

      <Button
        colorPalette="yellow"
        size="lg"
        onClick={handleSave}
        disabled={!isValid}
      >
        保存する
      </Button>
    </VStack>
  );
}
