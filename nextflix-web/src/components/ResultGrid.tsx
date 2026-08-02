"use client";
import type { Recommendation } from "@/lib/types";
import PosterCard from "./PosterCard";
type Props = {
    items: Recommendation[];
    pickedKey?: string;
    onSelect: (item: Recommendation) => void;
};
export default function ResultGrid({ items, pickedKey, onSelect }: Props) {
    return (<div className="grid stagger">
      {items.map((item, index) => (<PosterCard key={item.key} item={item} index={index} isPicked={item.key === pickedKey} onSelect={onSelect}/>))}
    </div>);
}
export function GridSkeleton({ count = 12 }: {
    count?: number;
}) {
    return (<div className="grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (<div key={index}>
          <div className="skeleton skeleton-art"/>
          <div className="skeleton skeleton-line"/>
          <div className="skeleton skeleton-line short"/>
        </div>))}
    </div>);
}
