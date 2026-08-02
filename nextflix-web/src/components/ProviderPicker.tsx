"use client";
import type { Provider } from "@/lib/types";
type Props = {
    providers: Provider[];
    selected: string[];
    loading: boolean;
    onToggle: (id: string) => void;
    onSelectAll: () => void;
};
export default function ProviderPicker({ providers, selected, loading, onToggle, onSelectAll, }: Props) {
    if (loading) {
        return (<div className="providers">
        <div className="providers-head">
          <span className="providers-title">Your services</span>
        </div>
        <div className="provider-chips" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (<div key={index} className="skeleton provider-skeleton"/>))}
        </div>
      </div>);
    }
    if (providers.length === 0) {
        return (<div className="providers">
        <p className="hint">No streaming services found for this region.</p>
      </div>);
    }
    const allSelected = selected.length === 0 || selected.length === providers.length;
    return (<div className="providers">
      <div className="providers-head">
        <span className="providers-title">
          Your services
          <span className="providers-note">
            {selected.length === 0
            ? " · searching everything"
            : ` · ${selected.length} selected`}
          </span>
        </span>
        <button type="button" className="linkish" onClick={onSelectAll} disabled={allSelected}>
          Select all
        </button>
      </div>

      <div className="provider-chips" role="group" aria-label="Streaming services">
        {providers.map((provider) => {
            const on = selected.length === 0 || selected.includes(provider.id);
            return (<button type="button" key={provider.id} className={`provider-chip${on ? " is-on" : ""}`} onClick={() => onToggle(provider.id)} aria-pressed={on} title={provider.name}>
              {provider.logoUrl ? (<img src={provider.logoUrl} alt="" loading="lazy"/>) : (<span className="provider-initial" aria-hidden="true">
                  {provider.name.charAt(0)}
                </span>)}
              <span className="provider-name">{provider.name}</span>
            </button>);
        })}
      </div>
    </div>);
}
