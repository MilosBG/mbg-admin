import { spinner } from "@/images";
import Image from "next/image";
import React from "react";

const Loader = () => {
  return (
    <div className="mbg-p-center h-screen">
      {/* <div className="border-mbg-green h-7 w-7 animate-spin rounded-full border-t-4 border-solid"></div> */}
      <Image unoptimized src={spinner} alt="Spinner MBG" className="h-7 w-7" />
    </div>
  );
};

export default Loader;
