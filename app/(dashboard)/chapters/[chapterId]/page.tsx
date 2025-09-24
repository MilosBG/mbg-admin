/* eslint-disable react-hooks/exhaustive-deps */


"use client";


import ChapterForm from "@/components/chapters/ChapterForm";
import Container from "@/components/mbg-components/Container";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Loader from "@/components/mbg-components/Loader";

export const dynamic = "force-dynamic";

const ChapterDetails = () => {
  const params = useParams<{ chapterId: string }>();
  const chapterId = params?.chapterId;

  const [loading, setLoading] = useState(true);
  const [chapterDetails, setChapterDetails] =
    useState<ChapterType | null>(null);

  const getChapterDetails = async () => {
    if (!chapterId) return;
    try {
      const res = await fetch(`/api/chapters/${params.chapterId}`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setChapterDetails(data);
    } catch (err) {
      console.log("[chapterId_GET]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getChapterDetails();
  }, [chapterId]); // Check if someting go wrong

  return loading ? (
    <Loader />
  ) : (
    <Container>
      <ChapterForm initialData={chapterDetails} />
    </Container>
  );
};

export default ChapterDetails;
