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
import { ChevronRight, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IoDocumentTextOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";

interface MandatDrawerProps {
  mandat: Mandat | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MandatDrawer({ mandat, isOpen, onClose }: MandatDrawerProps) {
  const router = useRouter();
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="!w-[400px] sm:!w-[540px] lg:!w-[600px] !max-w-full overflow-y-auto">
        <SheetHeader className=" pb-4 border-b ">
          {/* <SheetTitle>
            {mandat
              ? `#MND-2024-${String(mandat.id).padStart(3, "0")}`
              : "Détail du mandat"}
          </SheetTitle>
          <SheetDescription>
            {mandat?.nom || mandat?.payload?.nom || "Informations du mandat"}
          </SheetDescription> */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                router.push("/expediteur/mandats");
              }}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <IoDocumentTextOutline className="h-4 w-4" />
              <span>Mes mandats </span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <span className="font-medium text-[#186BB0]">
              Transport Rapide - Lausanne
            </span>

            <img
              src="/Badge.png"
              alt="Livré"
              className="h-10 w-10 object-contain"
            />
          </div>
        </SheetHeader>

        {mandat && (
          <div className="p-2">
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
