"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Mandat } from "@/types/mandat";
import { MandatContent } from "./MandatContent";

interface MandatDrawerProps {
  mandat: Mandat | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MandatDrawer({ mandat, isOpen, onClose }: MandatDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mandat
              ? `#MND-2024-${String(mandat.id).padStart(3, "0")}`
              : "Détail du mandat"}
          </SheetTitle>
          <SheetDescription>
            {mandat?.nom || mandat?.payload?.nom || "Informations du mandat"}
          </SheetDescription>
        </SheetHeader>

        {mandat && (
          <div className="mt-6">
            <MandatContent
              mandat={mandat}
              showFullDetailsButton={true}
              isDrawer={true}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
