import { Box, Badge, Button, Flex, HStack, Image, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "@remix-run/react";
import { RANK_COLORS, type TierEntry, type TierSkillSlot } from "../../lib/tier-types";

type WarriorData = {
  id: number;
  name: string;
  rarity: number;
};

type SkillData = {
  id: number;
  name: string;
};

type TierEntryCardProps = {
  entry: TierEntry;
  warriors: Map<number, WarriorData>;
  skills: Map<number, SkillData>;
  onDelete: (id: string) => void;
};

function WarriorSlotDisplay({
  warriorId,
  altWarriorIds,
  role,
  warriors,
  skillSlots,
  skills,
}: {
  warriorId: number;
  altWarriorIds: number[];
  role: string;
  warriors: Map<number, WarriorData>;
  skillSlots: TierSkillSlot[];
  skills: Map<number, SkillData>;
}) {
  const warrior = warriors.get(warriorId);
  const altWarriors = altWarriorIds
    .map((id) => warriors.get(id))
    .filter((w): w is WarriorData => w !== undefined);

  const skillLines = skillSlots.map((slot) => {
    const skillName = skills.get(slot.skill_id)?.name ?? `スキル#${slot.skill_id}`;
    const altNames = slot.alt_skill_ids
      .map((id) => skills.get(id)?.name ?? `#${id}`)
      .join(", ");
    return { skillName, altNames, hasAlt: slot.alt_skill_ids.length > 0 };
  });

  return (
    <Flex direction="column" gap={1}>
      <Flex align="center" gap={2}>
        {warrior ? (
          <>
            <Image
              src={`/hero/${encodeURIComponent(warrior.name)}.png`}
              alt={warrior.name}
              boxSize="32px"
              borderRadius="md"
              objectFit="cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <VStack align="start" gap={0}>
              <Text fontSize="sm" fontWeight="bold" color="white">
                {role}: {warrior.name}
              </Text>
              {altWarriors.length > 0 && (
                <Text fontSize="xs" color="gray.400">
                  代用: {altWarriors.map((w) => w.name).join(", ")}
                </Text>
              )}
            </VStack>
          </>
        ) : (
          <Text fontSize="sm" color="gray.500">
            {role}: 未設定
          </Text>
        )}
      </Flex>
      {skillLines.map(({ skillName, altNames, hasAlt }, i) => (
        <Text key={i} fontSize="xs" color="gray.400" pl={8}>
          {skillName}
          {hasAlt && <Text as="span" color="gray.600"> / 代用: {altNames}</Text>}
        </Text>
      ))}
    </Flex>
  );
}

export function TierEntryCard({ entry, warriors, skills, onDelete }: TierEntryCardProps) {
  const navigate = useNavigate();

  return (
    <Box
      bg="gray.900"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      p={4}
      position="relative"
      cursor="pointer"
      onClick={() => navigate(`/tiers/${entry.id}`)}
      _hover={{ borderColor: "whiteAlpha.400" }}
    >
      <Flex justify="space-between" align="center" mb={3}>
        <HStack gap={2}>
          <Badge
            bg={RANK_COLORS[entry.rank].bg}
            color={RANK_COLORS[entry.rank].badge}
            fontSize="lg"
            fontWeight="bold"
            px={3}
            py={1}
            borderRadius="md"
          >
            {entry.rank}
          </Badge>
          {entry.genres.map((genre) => (
            <Badge key={genre} variant="outline" colorPalette="blue" fontSize="xs">
              {genre}
            </Badge>
          ))}
        </HStack>
        <Button
          size="xs"
          variant="ghost"
          colorPalette="red"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(entry.id);
          }}
        >
          削除
        </Button>
      </Flex>

      <VStack align="stretch" gap={2} mb={entry.description ? 3 : 0}>
        {entry.slots.map((slot) => (
          <WarriorSlotDisplay
            key={slot.role}
            warriorId={slot.warrior_id}
            altWarriorIds={slot.alt_warrior_ids}
            role={slot.role}
            warriors={warriors}
            skillSlots={slot.skills}
            skills={skills}
          />
        ))}
      </VStack>

      {entry.description && (
        <Text fontSize="xs" color="gray.400" mt={2}>
          {entry.description}
        </Text>
      )}
    </Box>
  );
}
