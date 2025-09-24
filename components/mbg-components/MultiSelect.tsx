/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "../ui/badge";
import { X } from "lucide-react";

interface MultiSelectProps {
  placeholder: string;
  chapters: ChapterType[];
  value: string[];
  onChange: (value: string) => void;
  onRemove: (value: string) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  placeholder,
  chapters,
  value,
  onChange,
  onRemove,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);

  let selected: ChapterType[];

  if (value.length === 0) {
    selected = [];
  } else {
    selected = value.map((id) =>
      chapters.find((chapter) => chapter._id === id),
    ) as ChapterType[];
  }

    const selectables = chapters.filter((chapter) => !selected.includes(chapter) )

  return (
    <Command className="overflow-visible rounded-xs bg-transparent">
      <CommandInput
        placeholder={placeholder}
        value={inputValue}
        onValueChange={setInputValue}
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
      />
      <div className="flex flex-wrap gap-1 rounded-xs">
        {selected.map((chapter) => (
          <Badge
            key={chapter._id}
            className="bg-mbg-black/7 text-mbg-green mbg-text-up mt-2 rounded-xs outline-none"
          >
            {chapter.title}
            <button
              className="mbg-x2 hoverEffect"
              onClick={() => onRemove(chapter._id)}
            >
              <X className="mbg-icon2" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative mt-2">
        {open && (
          <CommandGroup className="border-mbg-black/7 bg-mbg-white absolute top-0 z-10 w-full overflow-auto rounded-sm border shadow-md">
            {selectables.map((chapter) => (
              <CommandItem
                key={chapter._id}
                onMouseDown={(e) => e.preventDefault()}
                onSelect={() => {
                    onChange(chapter._id);
                    setInputValue("");
                }}
                className="mbg-hover-bg"
              >
                {chapter.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </div>
    </Command>
  );
};

export default MultiSelect;
