import { AnimatePresence } from "framer-motion";
import { Layers, Trash2 } from "lucide-react";
import type { Image } from "../../types/docker";
import { Pill } from "../ui/Pill";
import { RowAction } from "./RowAction";
import { EmptyState, MonoId, RowShell } from "./parts";

interface ImagesTabProps {
  images: Image[];
  busy: Set<string>;
  onRemove: (image: Image) => void;
}

export function ImagesTab({ images, busy, onRemove }: ImagesTabProps) {
  if (images.length === 0) {
    return <EmptyState icon={Layers} message="No images in this context." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {images.map((image) => {
          const isBusy = busy.has(`image:${image.id}`);
          const name = image.dangling
            ? "<none>"
            : `${image.repository}:${image.tag}`;
          return (
            <RowShell key={image.id}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "truncate text-sm font-semibold " +
                      (image.dangling ? "text-white/45" : "text-white/90")
                    }
                  >
                    {name}
                  </span>
                  <MonoId>{image.id}</MonoId>
                  {image.dangling ? (
                    <Pill tone="amber">dangling</Pill>
                  ) : image.inUse ? (
                    <Pill tone="green">in use</Pill>
                  ) : (
                    <Pill tone="neutral">unused</Pill>
                  )}
                </div>
                <p className="truncate text-[11px] text-white/35">
                  {image.size} · {image.created}
                  {image.containers > 0 && ` · ${image.containers} container(s)`}
                </p>
              </div>

              <RowAction
                icon={Trash2}
                label="Remove image"
                danger
                busy={isBusy}
                onClick={() => onRemove(image)}
              />
            </RowShell>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
