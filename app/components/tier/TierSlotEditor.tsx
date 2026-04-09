import {
  Box,
  Button,
  Collapsible,
  HStack,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { TierSkillSlot, TierWarriorSlot } from "../../lib/tier-types";

type WarriorOption = {
  id: number;
  name: string;
  rarity: number;
};

type SkillOption = {
  id: number;
  name: string;
  skill_type: string;
  color: string | null;
  description: string;
};

type TierSlotEditorProps = {
  slot: TierWarriorSlot;
  allWarriors: WarriorOption[];
  allSkills: SkillOption[];
  onChange: (slot: TierWarriorSlot) => void;
};

export function TierSlotEditor({
  slot,
  allWarriors,
  allSkills,
  onChange,
}: TierSlotEditorProps) {
  const selectedWarrior = allWarriors.find((w) => w.id === slot.warrior_id);

  function handleWarriorChange(warriorId: number) {
    onChange({ ...slot, warrior_id: warriorId });
  }

  function handleSkillChange(index: number, skillId: number) {
    const newSkills = [...slot.skills];
    if (newSkills[index]) {
      newSkills[index] = { ...newSkills[index], skill_id: skillId };
    } else {
      newSkills[index] = { skill_id: skillId, alt_skill_ids: [] };
    }
    onChange({ ...slot, skills: newSkills });
  }

  function handleAddSkill() {
    onChange({
      ...slot,
      skills: [...slot.skills, { skill_id: 0, alt_skill_ids: [] }],
    });
  }

  function handleRemoveSkill(index: number) {
    onChange({
      ...slot,
      skills: slot.skills.filter((_, i) => i !== index),
    });
  }

  function handleAltWarriorChange(altIndex: number, warriorId: number) {
    const newAlts = [...slot.alt_warrior_ids];
    newAlts[altIndex] = warriorId;
    onChange({ ...slot, alt_warrior_ids: newAlts });
  }

  function handleAddAltWarrior() {
    if (slot.alt_warrior_ids.length >= 2) return;
    onChange({ ...slot, alt_warrior_ids: [...slot.alt_warrior_ids, 0] });
  }

  function handleRemoveAltWarrior(altIndex: number) {
    onChange({
      ...slot,
      alt_warrior_ids: slot.alt_warrior_ids.filter((_, i) => i !== altIndex),
    });
  }

  function handleAltSkillChange(
    skillIndex: number,
    altIndex: number,
    skillId: number,
  ) {
    const newSkills = slot.skills.map((s, i) => {
      if (i !== skillIndex) return s;
      const newAltIds = [...s.alt_skill_ids];
      newAltIds[altIndex] = skillId;
      return { ...s, alt_skill_ids: newAltIds };
    });
    onChange({ ...slot, skills: newSkills });
  }

  function handleAddAltSkill(skillIndex: number) {
    const skill = slot.skills[skillIndex];
    if (!skill || skill.alt_skill_ids.length >= 2) return;
    const newSkills = slot.skills.map((s, i) => {
      if (i !== skillIndex) return s;
      return { ...s, alt_skill_ids: [...s.alt_skill_ids, 0] };
    });
    onChange({ ...slot, skills: newSkills });
  }

  function handleRemoveAltSkill(skillIndex: number, altIndex: number) {
    const newSkills = slot.skills.map((s, i) => {
      if (i !== skillIndex) return s;
      return {
        ...s,
        alt_skill_ids: s.alt_skill_ids.filter((_, j) => j !== altIndex),
      };
    });
    onChange({ ...slot, skills: newSkills });
  }

  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
    >
      <HStack gap={2} mb={3}>
        <Text fontSize="sm" fontWeight="bold" color="yellow.300" minW="3rem">
          {slot.role}
        </Text>
        <NativeSelect.Root size="sm" flex="1">
          <NativeSelect.Field
            value={slot.warrior_id || ""}
            onChange={(e) => handleWarriorChange(Number(e.target.value))}
            bg="gray.900"
            borderColor="whiteAlpha.300"
          >
            <option value="">武将を選択</option>
            {allWarriors.map((w) => (
              <option key={w.id} value={w.id}>
                {"★".repeat(w.rarity)} {w.name}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </HStack>

      <VStack align="stretch" gap={2}>
        {slot.skills.map((skill, skillIdx) => (
          <Box key={skillIdx}>
            <HStack gap={2}>
              <NativeSelect.Root size="sm" flex="1">
                <NativeSelect.Field
                  value={skill.skill_id || ""}
                  onChange={(e) =>
                    handleSkillChange(skillIdx, Number(e.target.value))
                  }
                  bg="gray.900"
                  borderColor="whiteAlpha.300"
                >
                  <option value="">スキルを選択</option>
                  {allSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() => handleRemoveSkill(skillIdx)}
              >
                ×
              </Button>
            </HStack>

            <Collapsible.Root>
              <Collapsible.Trigger asChild>
                <Button size="xs" variant="ghost" px={0} mt={1}>
                  代用スキル ▼
                </Button>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <VStack align="stretch" gap={1} mt={1} pl={4}>
                  {skill.alt_skill_ids.map((altSkillId, altIdx) => (
                    <HStack key={altIdx} gap={2}>
                      <NativeSelect.Root size="xs" flex="1">
                        <NativeSelect.Field
                          value={altSkillId || ""}
                          onChange={(e) =>
                            handleAltSkillChange(
                              skillIdx,
                              altIdx,
                              Number(e.target.value),
                            )
                          }
                          bg="gray.900"
                          borderColor="whiteAlpha.300"
                        >
                          <option value="">代用スキル</option>
                          {allSkills.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </NativeSelect.Field>
                      </NativeSelect.Root>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => handleRemoveAltSkill(skillIdx, altIdx)}
                      >
                        ×
                      </Button>
                    </HStack>
                  ))}
                  {skill.alt_skill_ids.length < 2 && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleAddAltSkill(skillIdx)}
                      w="fit-content"
                    >
                      + 代用スキル追加
                    </Button>
                  )}
                </VStack>
              </Collapsible.Content>
            </Collapsible.Root>
          </Box>
        ))}
        {slot.skills.length < 3 && (
          <Button
            size="xs"
            variant="outline"
            onClick={handleAddSkill}
            w="fit-content"
          >
            + スキル追加
          </Button>
        )}
      </VStack>

      <Collapsible.Root>
        <Collapsible.Trigger asChild>
          <Button size="xs" variant="ghost" px={0} mt={3}>
            代用武将 ▼
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <VStack align="stretch" gap={2} mt={2} pl={4}>
            {slot.alt_warrior_ids.map((altId, altIdx) => (
              <HStack key={altIdx} gap={2}>
                <NativeSelect.Root size="sm" flex="1">
                  <NativeSelect.Field
                    value={altId || ""}
                    onChange={(e) =>
                      handleAltWarriorChange(altIdx, Number(e.target.value))
                    }
                    bg="gray.900"
                    borderColor="whiteAlpha.300"
                  >
                    <option value="">代用武将を選択</option>
                    {allWarriors.map((w) => (
                      <option key={w.id} value={w.id}>
                        {"★".repeat(w.rarity)} {w.name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={() => handleRemoveAltWarrior(altIdx)}
                >
                  ×
                </Button>
              </HStack>
            ))}
            {slot.alt_warrior_ids.length < 2 && (
              <Button
                size="xs"
                variant="outline"
                onClick={handleAddAltWarrior}
                w="fit-content"
              >
                + 代用武将追加
              </Button>
            )}
          </VStack>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
}
