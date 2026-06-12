"use client";

import { useState } from "react";
import { AssistantChat } from "@/components/patient/AssistantChat";
import { GhostButton } from "@/components/ui/GhostButton";
import { MessageCircle } from "lucide-react";

export function AssistantWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
      {open ? (
        <div className="w-[min(28rem,calc(100vw-2rem))]">
          <div className="mb-2 flex justify-end">
            <GhostButton
              type="button"
              className="py-1.5 text-xs"
              onClick={() => setOpen(false)}
            >
              Close
            </GhostButton>
          </div>
          <AssistantChat />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-tint px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-tint-bright transition active:scale-[0.99]"
        aria-label="Open assistant chat"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Ask Health AI
      </button>
    </div>
  );
}

