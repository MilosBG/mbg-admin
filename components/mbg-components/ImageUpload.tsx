/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { CldUploadWidget } from "next-cloudinary";
import Button from "./Button";
import Image from "next/image";
import { Plus, X } from "lucide-react";

interface ImageUploadProps {
  value: string[];
  onChange: (value: string) => void;
  onRemove: (value: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onChange,
  onRemove,
  value,
}) => {

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {value.map((url) => (
          <div key={url} className="relative h-[200px] w-[200px]">
            <div className="absolute top-2 right-2 z-10">
              <button
                type="button"
                onClick={() => onRemove(url)}
                className="mbg-x hoverEffect"
              >
                <X className="mbg-icon" />
              </button>
            </div>
            <Image
              src={url}
              alt="chapter"
              className="rounded-sm object-cover"
              fill
            />
          </div>
        ))}
      </div>
<CldUploadWidget
  uploadPreset="milosbg"
  options={{ multiple: true }}     // allow multi-select
  onSuccess={(result: any) => {
    const url = result?.info?.secure_url;
    if (url) onChange(url);        // parent merges with latest value
  }}
>
  {({ open }) => (
    <Button type="button" onClick={() => open()} mbg="treyfull" className="mbg-center">
      <Plus className="mbg-icon mbg-icon-fix" /> Upload Image
    </Button>
  )}
</CldUploadWidget>
    </div>
  );
};

export default ImageUpload;
