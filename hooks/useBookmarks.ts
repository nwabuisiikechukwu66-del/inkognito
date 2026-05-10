"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocalStorage } from "./useLocalStorage";
import { Id } from "@/convex/_generated/dataModel";

/**
 * useBookmarks — hooks/useBookmarks.ts
 * 
 * Manages the list of bookmarked confession IDs in localStorage
 * and fetches the actual content from Convex using the IDs.
 */
export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useLocalStorage<Id<"confessions">[]>("inkognito_bookmarks", []);

  // Fetch the full confession objects from Convex based on local IDs
  const bookmarkedConfessions = useQuery(api.confessions.getByIds, { 
    ids: bookmarkedIds 
  });

  const toggleBookmark = (id: Id<"confessions">) => {
    setBookmarkedIds((prev) => 
      prev.includes(id) 
        ? prev.filter((i) => i !== id) 
        : [...prev, id]
    );
  };

  const isBookmarked = (id: Id<"confessions">) => bookmarkedIds.includes(id);

  return {
    bookmarkedIds,
    bookmarkedConfessions,
    toggleBookmark,
    isBookmarked,
  };
}
