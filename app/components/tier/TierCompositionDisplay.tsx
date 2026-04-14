import { Box, Flex, HStack, VStack, Text, Image, Badge } from "@chakra-ui/react";
import { useState } from "react";
import type { TierWarriorSlot } from "../../lib/tier-types";

type WarriorInfo = { id: number; name: string; cost: number };
type SkillInfo = { id: number; name: string; color: string | null; description: string };

type TierCompositionDisplayProps = {
  slots: [TierWarriorSlot, TierWarriorSlot, TierWarriorSlot];
  warriorMap: Map<number, WarriorInfo>;
  skillMap: Map<number, SkillInfo>;
};

export function TierCompositionDisplay({ slots, warriorMap, skillMap }: TierCompositionDisplayProps) {
  return (
    <Flex gap={4} justify="center" align="start" wrap={{ base: "wrap", md: "nowrap" }}>
      {slots.map((slot) => (
        <SlotCard key={slot.role} slot={slot} warriorMap={warriorMap} skillMap={skillMap} />
      ))}
    </Flex>
  );
}

function SlotCard({
  slot,
  warriorMap,
  skillMap,
}: {
  slot: TierWarriorSlot;
  warriorMap: Map<number, WarriorInfo>;
  skillMap: Map<number, SkillInfo>;
}) {
  const warrior = warriorMap.get(slot.warrior_id);
  const [imgError, setImgError] = useState(false);
  const showImage = slot.warrior_id > 0 && warrior && !imgError;
  const showBadge = slot.warrior_id > 0 && warrior && warrior.cost > 0;

  const altWarriors = slot.alt_warrior_ids
    .map((id) => warriorMap.get(id))
    .filter((w): w is WarriorInfo => Boolean(w));

  return (
    <Box
      flex={1}
      minW="180px"
      maxW="260px"
      bg="linear-gradient(to bottom, #1a0a0a, #2d0505)"
      border="1px solid"
      borderColor="rgba(180,130,40,0.6)"
      borderRadius="lg"
      overflow="hidden"
    >
      <Box position="relative" h="220px">
        {showImage ? (
          <Image
            src={`/hero/${encodeURIComponent(warrior!.name)}.png`}
            alt={warrior!.name}
            w="100%"
            h="220px"
            objectFit="cover"
            objectPosition="top"
            onError={() => setImgError(true)}
          />
        ) : (
          <Flex bg="gray.800" h="220px" alignItems="center" justifyContent="center">
            <Text fontSize="lg" fontWeight="bold" color="gray.400">
              {warrior?.name ?? "未設定"}
            </Text>
          </Flex>
        )}

        {showBadge && (
          <Box
            position="absolute"
            top="8px"
            left="8px"
            zIndex={1}
            bg="linear-gradient(135deg, #c8a040, #8b6a20)"
            borderRadius="md"
            px={2}
            py={1}
          >
            <Text color="white" fontWeight="bold" fontSize="xs">
              令{warrior!.cost}
            </Text>
          </Box>
        )}

        {warrior && (
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            bg="linear-gradient(transparent, rgba(139,0,0,0.9))"
            px={2}
            py={2}
          >
            <HStack justify="space-between">
              <Text color="white" fontWeight="bold" fontSize="sm">
                {warrior.name}
              </Text>
              <Text color="yellow.300" fontWeight="bold" fontSize="md">
                {warrior.cost}
              </Text>
            </HStack>
          </Box>
        )}
      </Box>

      <Box px={2} py={2}>
        {slot.role === "軍師" && (
          <Text fontSize="xs" color="yellow.300" fontWeight="bold" mb={1}>
            軍師スキル
          </Text>
        )}

        <VStack align="start" gap={1}>
          {slot.skills.map((skillSlot, i) => {
            const skill = skillMap.get(skillSlot.skill_id);
            const skillName = skill?.name ?? `スキル#${skillSlot.skill_id}`;
            return (
              <VStack key={i} align="start" gap={0} w="100%">
                <Text fontSize="xs" color="white">
                  {skillName}
                </Text>
                {slot.role === "軍師" && skill?.description && (
                  <Text fontSize="2xs" color="gray.500">
                    {skill.description}
                  </Text>
                )}
              </VStack>
            );
          })}
        </VStack>

        {altWarriors.length > 0 && (
          <Box mt={2}>
            <Text fontSize="2xs" color="gray.400">
              代用武将
            </Text>
            <Flex wrap="wrap" gap={1} mt={1}>
              {altWarriors.map((w) => (
                <Badge key={w.id} variant="outline" colorPalette="gray" fontSize="2xs">
                  {w.name}
                </Badge>
              ))}
            </Flex>
          </Box>
        )}
      </Box>
    </Box>
  );
}
