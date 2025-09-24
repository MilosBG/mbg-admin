/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { chapterFormResolver, type ChapterFormValues } from "@/lib/formResolvers";

import Separator from "../mbg-components/Separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../ui/form";
import { H2 } from "../mbg-components/H2";
import Input from "../mbg-components/Input";
import Button from "../mbg-components/Button";
import Label from "../mbg-components/Label";
import TextArea from "../mbg-components/TextArea";
import ImageUpload from "../mbg-components/ImageUpload";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Delete from "../mbg-components/Delete";

type FormValues = ChapterFormValues;

interface ChapterFormProps {
  initialData?: ChapterType | null; //Must have "?" to make it optional
}

const ChapterForm: React.FC<ChapterFormProps> = ({ initialData }) => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: chapterFormResolver as Resolver<FormValues>,
    defaultValues: initialData
      ? {
          title: initialData.title ?? "",
          description: initialData.description ?? "",
          image: initialData.image ?? "",
        }
      : {
          title: "",
          description: "",
          image: "",
        },
  });

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
}
  } 

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      const url = initialData
        ? `/api/chapters/${initialData._id}`
        : "/api/chapters";
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(values),
      });

      if (res.ok) {
        setLoading(false);
        toast.success(`Chapter ${initialData ? "updated" : "created"}`);
        window.location.href = "/chapters";
        router.push("/chapters");
      }
    } catch (err) {
      console.log("[chapter_POST]", err);
      toast.error("Something went wrong ! Please try again.");
    }
  };

  return (
    <>
      {initialData ? (
        <div className="mbg-p-between">
          <H2>Edit Chapter</H2>
          <Delete id={initialData._id} item="chapter" />
        </div>
      ) : (
        <H2>Create Chapter</H2>
      )}

      <Separator className="mt-2 mb-7" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mbg-y-space4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <Label>Title</Label>
                <FormControl>
                  <Input placeholder="Title" {...field} onKeyDown={handleKeyPress} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <Label>Description</Label>
                <FormControl>
                  <TextArea placeholder="Description" {...field} rows={5} onKeyDown={handleKeyPress} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <Label>Image</Label>
                <FormControl>
                  <ImageUpload
                    value={field.value ? [field.value] : []}
                    onChange={(url) => field.onChange(url)}
                    onRemove={() => field.onChange("")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="mbg-p-center gap-10">
            <Button mbg="primefull" type="submit">
              Submit
            </Button>
            <Button
              mbg="secondfull"
              type="button"
              onClick={() => router.push("/chapters")}
            >
              Discard
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};

export default ChapterForm;
