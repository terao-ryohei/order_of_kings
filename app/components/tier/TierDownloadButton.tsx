import { useState } from "react";
import { Button } from "@chakra-ui/react";

type TierDownloadButtonProps = {
  captureRef: React.RefObject<HTMLDivElement | null>;
  rank: string;
  entryId: string;
};

export function TierDownloadButton({ captureRef, rank, entryId }: TierDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setLoading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(captureRef.current, {
        backgroundColor: "#1a0505",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `tier-${rank}-${entryId}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      colorPalette="green"
      size="sm"
      onClick={handleDownload}
      loading={loading}
      loadingText="生成中..."
    >
      PNG保存
    </Button>
  );
}
