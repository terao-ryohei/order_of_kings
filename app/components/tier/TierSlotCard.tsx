import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  ComboboxContent,
  ComboboxControl,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemText,
  ComboboxRoot,
  ComboboxTrigger,
  createListCollection,
  Flex,
  HStack,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";

function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}
import type {
  TierWarriorSlot,
  WarriorOption,
  SkillOption,
} from "../../lib/tier-types";

type TierSlotCardProps = {
  slot: TierWarriorSlot;
  allWarriors: WarriorOption[];
  allSkills: SkillOption[];
  isEditing: boolean;
  onChange?: (newSlot: TierWarriorSlot) => void;
};

type ComboboxOption = {
  label: string;
  value: string;
};

type SearchableComboboxProps = {
  options: ComboboxOption[];
  value: number;
  placeholder: string;
  emptyLabel: string;
  onChange: (value: number) => void;
};

function filterOptions(options: ComboboxOption[], search: string) {
  if (!search) return options;
  const katakanaSearch = toKatakana(search);
  return options.filter(
    (option) =>
      option.label.includes(search) || option.label.includes(katakanaSearch),
  );
}

function SearchableCombobox({
  options,
  value,
  placeholder,
  emptyLabel,
  onChange,
}: SearchableComboboxProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const visibleOptions = useMemo(
    () => filterOptions(options, debouncedSearch),
    [options, debouncedSearch],
  );
  const items = useMemo(
    () => [{ label: emptyLabel, value: "" }, ...visibleOptions],
    [emptyLabel, visibleOptions],
  );
  const collection = useMemo(
    () => createListCollection({ items }),
    [items],
  );

  return (
    <ComboboxRoot
      collection={collection}
      value={value > 0 ? [String(value)] : []}
      onInputValueChange={({ inputValue }) => setSearch(inputValue)}
      onValueChange={({ value: selectedValue }) => {
        onChange(Number(selectedValue[0] ?? 0));
        setSearch("");
      }}
      openOnClick
      size="xs"
      w="100%"
    >
      <ComboboxControl>
        <ComboboxInput
          placeholder={placeholder}
          bg="gray.800"
          borderColor="whiteAlpha.300"
          color="white"
        />
        <ComboboxTrigger
          bg="gray.800"
          borderColor="whiteAlpha.300"
          color="white"
        />
      </ComboboxControl>
      <ComboboxContent
        bg="gray.800"
        borderColor="whiteAlpha.300"
        color="white"
        maxH="240px"
        overflowY="auto"
        zIndex="popover"
      >
        {items.map((item) => (
          <ComboboxItem key={item.value || "empty"} item={item}>
            <ComboboxItemText>{item.label}</ComboboxItemText>
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </ComboboxRoot>
  );
}

export function TierSlotCard({
  slot,
  allWarriors,
  allSkills,
  isEditing,
  onChange,
}: TierSlotCardProps) {
  const warrior = allWarriors.find((w) => w.id === slot.warrior_id);
  const hasWarrior = slot.warrior_id > 0 && warrior;
  const [imageFailed, setImageFailed] = useState(false);
  const warriorOptions = useMemo(
    () => allWarriors.map((w) => ({ label: w.name, value: String(w.id) })),
    [allWarriors],
  );
  const skillOptions = useMemo(
    () => allSkills.map((s) => ({ label: s.name, value: String(s.id) })),
    [allSkills],
  );

  function update(newSlot: TierWarriorSlot) {
    onChange?.(newSlot);
  }

  function handleWarriorChange(warriorId: number) {
    const selectedWarrior = allWarriors.find((w) => w.id === warriorId);
    let newSkills = [...slot.skills];

    if (selectedWarrior && warriorId > 0) {
      const fixedSkillId =
        slot.role === "軍師"
          ? (selectedWarrior.gunshiSkillId ?? 0)
          : (selectedWarrior.uniqueSkillId ?? 0);
      const fixedSlot = {
        skill_id: fixedSkillId,
        alt_skill_ids: newSkills[0]?.alt_skill_ids ?? [],
      };
      newSkills = slot.role === "軍師" ? [fixedSlot] : [fixedSlot, ...newSkills.slice(1)];
    } else {
      newSkills = [];
    }

    update({ ...slot, warrior_id: warriorId, skills: newSkills, alt_warrior_ids: [] });
    setImageFailed(false);
  }

  function handleSkillChange(index: number, skillId: number) {
    const newSkills = [...slot.skills];
    if (newSkills[index]) {
      newSkills[index] = { ...newSkills[index], skill_id: skillId };
    } else {
      newSkills[index] = { skill_id: skillId, alt_skill_ids: [] };
    }
    update({ ...slot, skills: newSkills });
  }

  function handleAddSkill() {
    if (slot.skills.length >= 3) return;
    update({
      ...slot,
      skills: [...slot.skills, { skill_id: 0, alt_skill_ids: [] }],
    });
  }

  function handleRemoveSkill(index: number) {
    update({ ...slot, skills: slot.skills.filter((_, i) => i !== index) });
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
    update({ ...slot, skills: newSkills });
  }

  function handleAddAltSkill(skillIndex: number) {
    const skill = slot.skills[skillIndex];
    if (!skill || skill.alt_skill_ids.length >= 2) return;
    const newSkills = slot.skills.map((s, i) => {
      if (i !== skillIndex) return s;
      return { ...s, alt_skill_ids: [...s.alt_skill_ids, 0] };
    });
    update({ ...slot, skills: newSkills });
  }

  function handleRemoveAltSkill(skillIndex: number, altIndex: number) {
    const newSkills = slot.skills.map((s, i) => {
      if (i !== skillIndex) return s;
      return {
        ...s,
        alt_skill_ids: s.alt_skill_ids.filter((_, j) => j !== altIndex),
      };
    });
    update({ ...slot, skills: newSkills });
  }

  function handleAltWarriorChange(altIndex: number, warriorId: number) {
    const newAlts = [...slot.alt_warrior_ids];
    newAlts[altIndex] = warriorId;
    update({ ...slot, alt_warrior_ids: newAlts });
  }

  function handleAddAltWarrior() {
    if (slot.alt_warrior_ids.length >= 2) return;
    update({ ...slot, alt_warrior_ids: [...slot.alt_warrior_ids, 0] });
  }

  function handleRemoveAltWarrior(altIndex: number) {
    update({
      ...slot,
      alt_warrior_ids: slot.alt_warrior_ids.filter((_, i) => i !== altIndex),
    });
  }

  const showImage = hasWarrior && !imageFailed;

  return (
    <Box
      flex="1 1 0"
      minW="180px"
      maxW="260px"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="rgba(180,130,40,0.6)"
      overflow="hidden"
      bgGradient="linear(to-b, #1a0a0a, #2d0505)"
      style={{
        background: "linear-gradient(to bottom, #1a0a0a, #2d0505)",
      }}
    >
      <Box position="relative" h="220px" bg="gray.800">
        {showImage ? (
          <Image
            src={`/hero/${encodeURIComponent(warrior.name)}.png`}
            alt={warrior.name}
            w="100%"
            h="220px"
            objectFit="cover"
            objectPosition="top"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Flex h="220px" align="center" justify="center">
            <Text fontSize="xl" fontWeight="bold" color="gray.400">
              {hasWarrior ? warrior.name : "未設定"}
            </Text>
          </Flex>
        )}

        {hasWarrior && warrior.cost > 0 && (
          <Box
            position="absolute"
            top="8px"
            left="8px"
            borderRadius="md"
            px={2}
            py={1}
            style={{
              background: "linear-gradient(135deg, #c8a040, #8b6a20)",
            }}
          >
            <Text color="white" fontWeight="bold" fontSize="sm">
              令{warrior.cost}
            </Text>
          </Box>
        )}

        {hasWarrior && (
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            px={2}
            py={2}
            style={{
              background:
                "linear-gradient(transparent, rgba(139,0,0,0.9))",
            }}
          >
            <HStack justify="space-between" align="end">
              <Text color="white" fontWeight="bold" fontSize="md">
                {warrior.name}
              </Text>
              <Text color="yellow.300" fontWeight="bold" fontSize="lg">
                {warrior.cost}
              </Text>
            </HStack>
          </Box>
        )}
      </Box>

      <VStack align="stretch" gap={2} p={2}>
        <Text fontSize="xs" color="yellow.300" fontWeight="bold">
          {slot.role}
        </Text>

        {isEditing && (
          <SearchableCombobox
            options={warriorOptions}
            value={slot.warrior_id}
            placeholder="武将を検索..."
            emptyLabel="武将を選択"
            onChange={handleWarriorChange}
          />
        )}

        {slot.role === "軍師" && (
          <Text fontSize="xs" color="yellow.300" fontWeight="bold" mb={1}>
            軍師スキル
          </Text>
        )}

        <VStack align="stretch" gap={2}>
          {slot.skills.map((skillSlot, skillIdx) => {
            const skill = allSkills.find((s) => s.id === skillSlot.skill_id);
            const altNames = skillSlot.alt_skill_ids
              .map((id) => allSkills.find((s) => s.id === id)?.name)
              .filter((n): n is string => Boolean(n));
            return (
              <Box key={skillIdx}>
                <HStack gap={2} align="start">
                  <VStack align="start" gap={0} flex="1" minW={0}>
                    {isEditing && skillIdx === 0 ? (
                      <Text fontSize="xs" color="yellow.200" fontWeight="bold">
                        {(slot.role === "軍師"
                          ? warrior?.gunshiSkillName
                          : warrior?.uniqueSkillName) ?? "(固有スキル未設定)"}
                      </Text>
                    ) : isEditing ? (
                      <SearchableCombobox
                        options={skillOptions}
                        value={skillSlot.skill_id}
                        placeholder="スキルを検索..."
                        emptyLabel="スキル選択"
                        onChange={(skillId) =>
                          handleSkillChange(skillIdx, skillId)
                        }
                      />
                    ) : skillIdx === 0 ? (
                      <Text fontSize="xs" color="white">
                        {(slot.role === "軍師"
                          ? warrior?.gunshiSkillName
                          : warrior?.uniqueSkillName) ?? "(未設定)"}
                      </Text>
                    ) : (
                      <Text fontSize="xs" color="white">
                        {skill?.name ?? "(未設定)"}
                      </Text>
                    )}
                    {slot.role === "軍師" && skill?.description && (
                      <Text fontSize="xs" color="gray.500">
                        {skill.description}
                      </Text>
                    )}
                    {!isEditing && altNames.length > 0 && (
                      <Text fontSize="2xs" color="gray.400">
                        代用: {altNames.join(", ")}
                      </Text>
                    )}
                  </VStack>
                  {isEditing && skillIdx > 0 && slot.role !== "軍師" && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => handleRemoveSkill(skillIdx)}
                    >
                      ×
                    </Button>
                  )}
                </HStack>

                {isEditing && skillIdx > 0 && slot.role !== "軍師" && (
                  <VStack align="stretch" gap={1} mt={1} pl={10}>
                    {skillSlot.alt_skill_ids.map((altId, altIdx) => (
                      <HStack key={altIdx} gap={1}>
                        <Box flex="1">
                          <SearchableCombobox
                            options={skillOptions}
                            value={altId}
                            placeholder="代用スキルを検索..."
                            emptyLabel="代用"
                            onChange={(skillId) =>
                              handleAltSkillChange(skillIdx, altIdx, skillId)
                            }
                          />
                        </Box>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() =>
                            handleRemoveAltSkill(skillIdx, altIdx)
                          }
                        >
                          ×
                        </Button>
                      </HStack>
                    ))}
                    {skillSlot.alt_skill_ids.length < 2 && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleAddAltSkill(skillIdx)}
                      >
                        + 代用
                      </Button>
                    )}
                  </VStack>
                )}
              </Box>
            );
          })}
          {isEditing && slot.skills.length < 3 && slot.role !== "軍師" && (
            <Button size="xs" variant="outline" onClick={handleAddSkill}>
              + スキル追加
            </Button>
          )}
        </VStack>

        {!isEditing && slot.alt_warrior_ids.length > 0 && (
          <Box>
            <Text fontSize="xs" color="gray.400" mb={1}>
              代用武将
            </Text>
            <Flex wrap="wrap" gap={1}>
              {slot.alt_warrior_ids.map((altId, idx) => {
                const alt = allWarriors.find((w) => w.id === altId);
                if (!alt) return null;
                return (
                  <Badge
                    key={idx}
                    variant="outline"
                    colorPalette="gray"
                    fontSize="xs"
                  >
                    {alt.name}
                  </Badge>
                );
              })}
            </Flex>
          </Box>
        )}

        {isEditing && (
          <Box>
            <Text fontSize="xs" color="gray.400" mb={1}>
              代用武将
            </Text>
            <VStack align="stretch" gap={1}>
              {slot.alt_warrior_ids.map((altId, altIdx) => (
                <HStack key={altIdx} gap={1}>
                  <Box flex="1">
                    <SearchableCombobox
                      options={warriorOptions}
                      value={altId}
                      placeholder="代用武将を検索..."
                      emptyLabel="代用武将"
                      onChange={(warriorId) =>
                        handleAltWarriorChange(altIdx, warriorId)
                      }
                    />
                  </Box>
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
                >
                  + 代用武将追加
                </Button>
              )}
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
