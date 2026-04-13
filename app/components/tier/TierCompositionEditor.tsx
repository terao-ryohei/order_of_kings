import { Flex } from "@chakra-ui/react";
import type {
  TierWarriorSlot,
  WarriorOption,
  SkillOption,
} from "../../lib/tier-types";
import { TierSlotCard } from "./TierSlotCard";

type TierCompositionEditorProps = {
  slots: [TierWarriorSlot, TierWarriorSlot, TierWarriorSlot];
  allWarriors: WarriorOption[];
  allSkills: SkillOption[];
  onChange: (index: number, newSlot: TierWarriorSlot) => void;
};

export function TierCompositionEditor({
  slots,
  allWarriors,
  allSkills,
  onChange,
}: TierCompositionEditorProps) {
  return (
    <Flex
      gap={4}
      justify="center"
      align="start"
      wrap={{ base: "wrap", md: "nowrap" }}
    >
      {slots.map((slot, i) => (
        <TierSlotCard
          key={slot.role}
          slot={slot}
          allWarriors={allWarriors}
          allSkills={allSkills}
          isEditing={true}
          onChange={(newSlot) => onChange(i, newSlot)}
        />
      ))}
    </Flex>
  );
}
