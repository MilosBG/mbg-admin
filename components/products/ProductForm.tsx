/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";
import React, { useEffect, useState } from "react";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import {
  productFormResolver,
  type ProductFormValues,
} from "@/lib/formResolvers";

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
import { fetchWithTimeout } from "@/lib/utils";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Delete from "../mbg-components/Delete";
import MultiText from "../mbg-components/MultiText";
import MultiSelect from "../mbg-components/MultiSelect";
import Loader from "../mbg-components/Loader";

type FormValues = ProductFormValues;

interface ProductFormProps {
  initialData?: ProductType | null; //Must have "?" to make it optional
}

const ProductForm: React.FC<ProductFormProps> = ({ initialData }) => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [chapters, setChapters] = useState<ChapterType[]>([]);

  const getChapters = async () => {
    try {
      const res = await fetchWithTimeout("/api/chapters", {
        method: "GET",
        timeoutMs: 15000,
      });
      const data = await res.json();
      setChapters(data);
      setLoading(false);
    } catch (err) {
      console.log("[chapters_GET]", err);
      toast.error("Something went wrong! Please try again.");
    }
  };

  useEffect(() => {
    getChapters();
  }, []);

  const defaultValues: FormValues = initialData
    ? {
        title: initialData.title ?? "",
        description: initialData.description ?? "",
        media: (initialData.media as unknown as string[]) ?? [],
        category: initialData.category ?? "",
        chapters: (initialData.chapters || []).map(
          (chapter: any) => chapter._id,
        ),
        tags: (initialData.tags as unknown as string[]) ?? [],
        sizes: (initialData.sizes as unknown as string[]) ?? [],
        colors: (initialData.colors as unknown as string[]) ?? [],
        price: (initialData.price as unknown as number) ?? 0.1,
        expense: (initialData.expense as unknown as number) ?? 0.1,
        // @ts-ignore older docs may not have this
        countInStock: (initialData as any).countInStock ?? 0,
        // variants from DB if present
        // @ts-ignore backward compatibility
        variants: Array.isArray((initialData as any).variants)
          ? (initialData as any).variants.map((v: any) => ({
              color: v?.color ?? "",
              size: v?.size ?? "",
              stock: Number(v?.stock ?? 0) || 0,
            }))
          : [],
        // @ts-ignore optional flag
        fetchToStore: Boolean((initialData as any)?.fetchToStore),
      }
    : {
        title: "",
        description: "",
        media: [],
        category: "",
        chapters: [],
        tags: [],
        sizes: [],
        colors: [],
        price: 0.1,
        expense: 0.1,
        countInStock: 0,
        variants: [],
        fetchToStore: false,
      };

  const resolver: Resolver<FormValues> =
    productFormResolver as Resolver<FormValues>;
  const form = useForm<FormValues>({
    resolver,
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Propagate live stock/variants updates into the form when fields are not dirty
  useEffect(() => {
    if (!initialData) return;
    const di: any = initialData as any;
    const dirty: any = (form.formState?.dirtyFields as any) || {};
    if (!dirty?.countInStock && typeof di?.countInStock === "number") {
      form.setValue("countInStock", Math.max(0, Number(di.countInStock) || 0), {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
    if (!dirty?.variants && Array.isArray(di?.variants)) {
      const mapped = (di.variants as any[]).map((v: any) => ({
        color: v?.color ?? "",
        size: v?.size ?? "",
        stock: Number(v?.stock ?? 0) || 0,
      }));
      form.setValue("variants", mapped as any, {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [
    initialData?.countInStock,
    JSON.stringify((initialData as any)?.variants || []),
  ]);

  const handleKeyPress = (
    e:
      | React.KeyboardEvent<HTMLInputElement>
      | React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      setLoading(true);
      const url = initialData
        ? `/api/products/${initialData._id}`
        : "/api/products";
      // Coerce numbers explicitly to be extra safe
      const payload: FormValues = {
        title: values.title,
        description: values.description,
        media: Array.isArray(values.media) ? values.media : [],
        category: values.category,
        chapters: Array.isArray(values.chapters) ? values.chapters : [],
        tags: Array.isArray(values.tags) ? values.tags : [],
        sizes: Array.isArray(values.sizes) ? values.sizes : [],
        colors: Array.isArray(values.colors) ? values.colors : [],
        price: Number(values.price),
        expense: Number(values.expense),
        countInStock: Math.max(0, Number(values.countInStock)),
        variants: Array.isArray(values.variants)
          ? values.variants.map((v) => ({
              color: v?.color || undefined,
              size: v?.size || undefined,
              stock: Math.max(0, Number(v?.stock || 0)),
            }))
          : undefined,
        fetchToStore: Boolean((values as any).fetchToStore),
      };

      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setLoading(false);
        toast.success(`Product ${initialData ? "updated" : "created"}`);
        window.location.href = "/products";
        router.push("/products");
      }
    } catch (err) {
      console.log("[product_POST]", err);
      toast.error("Something went wrong ! Please try again.");
    }
  };

  console.log("initialData", initialData);
  console.log("chapters", chapters);

  return loading ? (
    <Loader />
  ) : (
    <>
      {initialData ? (
        <div className="mbg-p-between">
          <H2>Edit Product</H2>
          <Delete id={initialData._id} item="product" />
        </div>
      ) : (
        <H2>Create Product</H2>
      )}

      <Separator className="mt-2 mb-7" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mbg-y-space4">
          <div className="mbg-p-center mbg-y-space4 flex-wrap">
            <div className="w-full">
              <FormField<FormValues>
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <Label>Title</Label>
                    <FormControl>
                      <Input
                        placeholder="Title"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        onKeyDown={handleKeyPress}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-full">
              <FormField<FormValues>
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <Label>Description</Label>
                    <FormControl>
                      <TextArea
                        placeholder="Description"
                        {...field}
                        rows={5}
                        onKeyDown={handleKeyPress}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-full">
              <FormField<FormValues>
                control={form.control}
                name="media"
                render={({ field }) => (
                  <FormItem>
                    <Label>Image</Label>
                    <FormControl>
                      <ImageUpload
                        value={field.value ?? []}
                        onChange={(url: string) => {
                          const current = form.getValues("media") ?? [];
                          form.setValue("media", [...current, url], {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }}
                        onRemove={(url: string) => {
                          const current = form.getValues("media") ?? [];
                          form.setValue(
                            "media",
                            current.filter((img) => img !== url),
                            { shouldDirty: true, shouldTouch: true },
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-full">
              <FormField<FormValues>
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <Label>Price (€)</Label>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Price"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        onKeyDown={handleKeyPress}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-full">
              <FormField<FormValues>
                control={form.control}
                name="expense"
                render={({ field }) => (
                  <FormItem>
                    <Label>Expense (€)</Label>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Expense"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Math.max(0, Number(e.target.value)))
                        }
                        onKeyDown={handleKeyPress}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {chapters.length > 0 && (
              <div className="w-full">
                <FormField<FormValues>
                  control={form.control}
                  name="chapters"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Chapters</Label>
                      <FormControl>
                        <MultiSelect
                          placeholder="Chapters"
                          chapters={chapters}
                          value={field.value}
                          onChange={(_id) =>
                            field.onChange([...field.value, _id])
                          }
                          onRemove={(idToRemove) =>
                            field.onChange([
                              ...field.value.filter(
                                (chapterId) => chapterId !== idToRemove,
                              ),
                            ])
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            <div className="w-full">
              <FormField<FormValues>
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <Label>Category</Label>
                    <FormControl>
                      <Input
                        placeholder="Category"
                        {...field}
                        onKeyDown={handleKeyPress}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-full">
              <FormField<FormValues>
                control={form.control}
                name="sizes"
                render={({ field }) => (
                  <FormItem>
                    <Label>Sizes</Label>
                    <FormControl>
                      <MultiText
                        placeholder="Sizes"
                        value={field.value}
                        onChange={(size) =>
                          field.onChange([...field.value, size])
                        }
                        onRemove={(sizeToRemove) =>
                          field.onChange([
                            ...field.value.filter(
                              (size) => size !== sizeToRemove,
                            ),
                          ])
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-full">
              <FormField<FormValues>
                control={form.control}
                name="colors"
                render={({ field }) => (
                  <FormItem>
                    <Label>Colors</Label>
                    <FormControl>
                      <MultiText
                        placeholder="Colors"
                        value={field.value}
                        onChange={(color) =>
                          field.onChange([...field.value, color])
                        }
                        onRemove={(colorToRemove) =>
                          field.onChange([
                            ...field.value.filter(
                              (color) => color !== colorToRemove,
                            ),
                          ])
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-full">
              <FormField<FormValues>
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <Label>Tags</Label>
                    <FormControl>
                      <MultiText
                        placeholder="Tags"
                        value={field.value}
                        onChange={(tag) =>
                          field.onChange([...field.value, tag])
                        }
                        onRemove={(tagToRemove) =>
                          field.onChange([
                            ...field.value.filter((tag) => tag !== tagToRemove),
                          ])
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          {/* Fetch to store toggle */}
          <div className="w-full">
            <FormField<FormValues>
              control={form.control}
              name="fetchToStore"
              render={({ field }) => (
                <FormItem>
                  <Label>Available to Milos BG store</Label>
                  <FormControl>
                    <div className="text-mbg-black flex items-center gap-2 text-xs">
                      <input
                        id="fetchToStore"
                        type="checkbox"
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      <label htmlFor="fetchToStore" className="cursor-pointer">
                        Allow ecommerce to fetch this product
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Variants Editor */}
          <Label>Variants (color/size stock)</Label>
          <div className="bg-mbg-black/7 mt-2 w-full px-2 py-2">
            {(() => {
              const variants = form.watch("variants") || [];
              const set = (updater: (arr: any[]) => any[]) => {
                const current = form.getValues("variants") || [];
                form.setValue("variants", updater(current), {
                  shouldDirty: true,
                  shouldTouch: true,
                });
              };
              return (
                <div className="space-y-2">
                  {variants.map((v: any, idx: number) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 items-center gap-2"
                    >
                      <Input
                        className="col-span-4"
                        placeholder="Color"
                        value={v?.color ?? ""}
                        onChange={(e) =>
                          set((arr) =>
                            arr.map((x, i) =>
                              i === idx ? { ...x, color: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <Input
                        className="col-span-4"
                        placeholder="Size"
                        value={v?.size ?? ""}
                        onChange={(e) =>
                          set((arr) =>
                            arr.map((x, i) =>
                              i === idx ? { ...x, size: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <Input
                        className="col-span-3"
                        type="number"
                        placeholder="0"
                        value={String(v?.stock ?? 0)}
                        onChange={(e) =>
                          set((arr) =>
                            arr.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    stock: Math.max(
                                      0,
                                      Number(e.target.value || 0),
                                    ),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="text-mbg-green col-span-1 text-[10px] tracking-widest uppercase"
                        onClick={() =>
                          set((arr) => arr.filter((_, i) => i !== idx))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-mbg-green text-[10px] underline"
                      onClick={() =>
                        set((arr) => [
                          ...arr,
                          { color: "", size: "", stock: 0 },
                        ])
                      }
                    >
                      + Add Variant
                    </button>
                    <button
                      type="button"
                      className="text-mbg-black text-[10px] underline"
                      onClick={() => {
                        const list = form.getValues("variants") || [];
                        const total = list.reduce(
                          (s: number, it: any) => s + Number(it?.stock || 0),
                          0,
                        );
                        form.setValue("countInStock", total, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      Synchronise total stock
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="w-full">
            <FormField<FormValues>
              control={form.control}
              name="countInStock"
              render={({ field }) => (
                <FormItem>
                  <Label>Count In Stock</Label>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Count in stock"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(Math.max(0, Number(e.target.value)))
                      }
                      onKeyDown={handleKeyPress}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mbg-p-center gap-10">
            <Button mbg="primefull" type="submit">
              Submit
            </Button>
            <Button
              mbg="secondfull"
              type="button"
              onClick={() => router.push("/products")}
            >
              Discard
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};

export default ProductForm;
