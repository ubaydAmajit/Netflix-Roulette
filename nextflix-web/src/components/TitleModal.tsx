"use client";
import { useEffect, useRef, useState } from "react";
import { loadTitleExtras } from "@/app/actions";
import type { Recommendation, TitleExtras } from "@/lib/types";
import Meta from "./Meta";
type Props = {
    item: Recommendation;
    region: string;
    mine: string[];
    autoplayTrailer?: boolean;
    onClose: () => void;
};
export default function TitleModal({ item, region, mine, autoplayTrailer = false, onClose, }: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const [extras, setExtras] = useState<TitleExtras | null>(null);
    const [playing, setPlaying] = useState(false);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape")
                onClose();
        };
        document.addEventListener("keydown", onKey);
        document.body.classList.add("is-locked");
        closeRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.classList.remove("is-locked");
        };
    }, [onClose]);
    useEffect(() => {
        let live = true;
        setExtras(null);
        setPlaying(false);
        loadTitleExtras(item.mediaType, item.id, region).then((result) => {
            if (!live)
                return;
            setExtras(result);
            if (autoplayTrailer && result.trailer)
                setPlaying(true);
        });
        return () => {
            live = false;
        };
    }, [item.mediaType, item.id, region, autoplayTrailer]);
    const hasSelection = mine.length > 0;
    const trailer = extras?.trailer ?? null;
    return (<div className="modal-scrim" role="dialog" aria-modal="true" aria-label={item.title} onClick={(event) => {
            if (event.target === event.currentTarget)
                onClose();
        }}>
      <div className="modal">
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose}>
          <span aria-hidden="true">✕</span>
          <span className="sr-only">Close</span>
        </button>

        <div className="modal-art-wrap">
          {playing && trailer ? (<>
              
              <iframe className="modal-video" src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1&playsinline=1`} title={trailer.name} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
              <p className="video-escape">
                Won&apos;t play?{" "}
                <a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener noreferrer">
                  Watch on YouTube ↗
                </a>
              </p>
            </>) : (<div className="modal-art" style={item.backdropUrl ? { backgroundImage: `url(${item.backdropUrl})` } : undefined}>
              {trailer ? (<button type="button" className="play-btn" onClick={() => setPlaying(true)} aria-label={`Play trailer for ${item.title}`}>
                  <span className="play-tri" aria-hidden="true"/>
                </button>) : null}

              <div className="modal-heading">
                <h2>{item.title}</h2>
              </div>
            </div>)}
        </div>

        <div className="modal-body">
          <div className="modal-meta">
            <Meta item={item} detailed/>
          </div>

          <p className="synopsis">{item.synopsis || "No synopsis available."}</p>

          <div className="availability">
            <h3>Streaming on</h3>
            {extras === null ? (<div className="avail-row" aria-hidden="true">
                {Array.from({ length: 3 }, (_, index) => (<div key={index} className="skeleton avail-skeleton"/>))}
              </div>) : extras.availability.services.length === 0 ? (<p className="hint">
                Not on any subscription service in this region right now.
              </p>) : (<div className="avail-row">
                {extras.availability.services.map((service) => {
                const owned = !hasSelection || mine.includes(service.id);
                return (<span key={service.id} className={`avail-chip${owned ? " is-owned" : ""}`} title={owned ? service.name : `${service.name} — not in your services`}>
                      {service.logoUrl ? (<img src={service.logoUrl} alt=""/>) : null}
                      <span>{service.name}</span>
                    </span>);
            })}
              </div>)}
          </div>

          <div className="modal-actions">
            {trailer && !playing ? (<button type="button" className="btn btn-primary" onClick={() => setPlaying(true)}>
                ▶ Trailer
              </button>) : null}
            {extras?.availability.link ? (<a href={extras.availability.link} target="_blank" rel="noopener noreferrer" className="btn btn-light">
                Where to watch
              </a>) : null}
            <a href={item.tmdbUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              TMDB
            </a>
          </div>
        </div>
      </div>
    </div>);
}
