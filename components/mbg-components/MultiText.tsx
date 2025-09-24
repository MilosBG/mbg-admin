"use client";
import React, { useState } from "react";
import Input from "./Input";
import { Badge } from "../ui/badge";
import { X } from "lucide-react";

interface MultiTextProps {
  placeholder: string;
  value: string[];
  onChange: (value: string) => void;
  onRemove: (value: string) => void;
}

const MultiText: React.FC<MultiTextProps> = ({
  placeholder,
  value,
  onChange,
  onRemove,
}) => {
  const [inputValue, setInputValue] = useState("");

  const addValue = (item: string) => {
    onChange(item);
    setInputValue("");
  };
  return (
    <>
      <Input
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addValue(inputValue);
          }
        }}
      />
      <div className="flex flex-wrap gap-1">
        {value.map((item, index) => (
          <Badge
            key={index}
            className="bg-mbg-black/7 text-mbg-green mbg-text-up rounded-xs outline-none"
          >
            {item}
            <button
              type="button"
              className="mbg-x2 hoverEffect"
              onClick={() => onRemove(item)}
            >
              <X className="mbg-icon2" />
            </button>
          </Badge>
        ))}
      </div>
    </>
  );
};

export default MultiText;
