/* eslint-disable @typescript-eslint/no-unused-vars */


"use client";


import { columns } from "@/components/chapters/ChapterColumns";
import Button from "@/components/mbg-components/Button";
import Container from "@/components/mbg-components/Container";
import { DataTable } from "@/components/mbg-components/DataTable";
import { H2 } from "@/components/mbg-components/H2";
import Separator from "@/components/mbg-components/Separator";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

const Chapters = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState([]);

  const getChapters = async () => {
    try {
      const res = await fetch("/api/chapters", {
        method: "GET",
      });
      const data = await res.json();
      setChapters(data);
      setLoading(false);
    } catch (err) {
      console.log("chapters_GET", err);
    }
  };

  useEffect(() => {
    getChapters();
  }, []);

  return (
    <Container>
      <H2>Chapters</H2>
      <Separator className="bg-mbg-black mt-2 mb-4" />
      <Button
        mbg="treyfull"
        className="mbg-center mb-7"
        onClick={() => router.push("/chapters/new")}
      >
        <Plus className="mbg-icon mbg-icon-fix" /> Create Chapter
      </Button>
      <DataTable columns={columns} data={chapters} searchKey="title" />
    </Container>
  );
};

export default Chapters;
