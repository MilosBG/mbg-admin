"use client";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import React from "react";

import { MilosBG } from "@/images";
import { navLinks } from "@/lib/constants";
import { usePathname } from "next/navigation";

const baseClass = "bg-mbg-black sticky top-0 left-0 flex h-screen w-[15%] flex-col gap-10 p-6 shadow-xl max-lg:hidden";

const LeftSideBar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...rest }) => {
  const pathname = usePathname();
  return (
    <div className={`${baseClass} ${className}`.trim()} {...rest}>
      <Image src={MilosBG} alt="Milos BG" width={150} />
      <div className="flex flex-col gap-4">
        {navLinks.map((link) => (
          <Link
            href={link.url}
            key={link.label}
            className={`mbg-center body-medium ${
              pathname === link.url ? "text-mbg-white" : "text-mbg-green"
            }`}
          >
            {link.icon}
            <p>{link.label}</p>
          </Link>
        ))}
      </div>

      <Link href="/sign-in">
        <div className="mbg-p-center bg-mbg-green/27  p-1">
          <div className="bg-mbg-green rounded-full mbg-p-center p-1.5 m-3"><UserButton /></div>
        </div>
      </Link>
    </div>
  );
};

export default LeftSideBar;
