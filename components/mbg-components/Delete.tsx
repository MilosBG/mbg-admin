/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { Trash } from "lucide-react";
import React, { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";

interface DeleteProps {
  item: string;
  id: string;
}

const Delete: React.FC<DeleteProps> = ({ item, id }) => {
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    try {
      setLoading(true);
      const itemType = item === "product" ? "products" : "chapters";
      const res = await fetch(`/api/${itemType}/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLoading(false);
        window.location.href = `/${itemType}`;
        toast.success(`${item} deleted`);
      }
    } catch (err) {
      console.log(err);
      toast.error("Something went wrong. Please try again.");
    }
  };
  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger>
          <div className="mbg-trash">
            <Trash type="button" className="mbg-icon" />
          </div>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm uppercase">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-mbg-green text-xs">
              This action cannot be undone. This will permanently delete your{" "}
              {item}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="mbg-prime-full" onClick={onDelete}>
              Delete
            </AlertDialogAction>
            <AlertDialogCancel type="button" className="mbg-second-full">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Delete;
