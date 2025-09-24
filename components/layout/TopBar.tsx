"use client";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { MdGridView } from "react-icons/md";

import { MilosBG } from "@/images";
import { navLinks } from "@/lib/constants";

const TopBar = () => {
  const [dropdownMenu, setDorpdownMenu] = useState(false);
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-20 w-full mbg-p-between px-8 py-4 bg-black shadow-xl lg:hidden">
      <Image src={MilosBG} alt="Milos BG" width={150} />
      <div className="flex  gap-8 max-md:hidden">
        {navLinks.map((link) => (
          <Link
            href={link.url}
            key={link.label}
            className={`mbg-center body-medium  ${
              pathname === link.url ? "text-mbg-white" : "text-mbg-green"
            }`}
          >
            <p>{link.label}</p>
          </Link>
        ))}
      </div>

      <div className="mbg-center  relative">
        <div
          className="mbg-item md:hidden "
          onClick={() => setDorpdownMenu(!dropdownMenu)}
        >
          {dropdownMenu && (
            <div className="flex flex-col gap-8 p-5 absolute top-10 leftt-10 w-[200%] bg-mbg-black/7 shadow-xs rounded-xs">
              {navLinks.map((link) => (
                <Link
                  href={link.url}
                  key={link.label}
                  className="mbg-center body-medium mbg-hover hoverEffect"
                >
                  {link.icon}
                  <p>{link.label}</p>
                </Link>
              ))}
            </div>
          )}
          <MdGridView className="mbg-icon md:hidden" />
        </div>
        <div className="mbg-item">
          <UserButton />
        </div>
      </div>
    </div>
  );
};

export default TopBar;
