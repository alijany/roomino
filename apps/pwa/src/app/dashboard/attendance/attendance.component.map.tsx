'use client';

import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

/**
 * OpenStreetMap via Leaflet — the attendance maps Tesmino has:
 *  - a workplace and its allowed radius, optionally with "you are here";
 *  - one day's check-in (green) and check-out (red) points;
 *  - a picker: click or drag the pin to set a workplace's location.
 *
 * Leaflet touches `window`, so it is imported inside an effect and never on
 * the server. Pins are `divIcon`s: Leaflet's default marker images don't
 * survive bundling.
 */

export interface MapCircle {
  lat: number;
  lng: number;
  radius: number;
  label?: string;
}

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  color: string;
  /** Keep the label visible rather than on hover. */
  permanent?: boolean;
  /** Which side the label sits on — keeps two labels on one spot apart. */
  labelSide?: 'top' | 'bottom';
}

export const MAP_COLORS = {
  /** The allowed radius, in the brand blue. */
  radius: '#016BFF',
  workplace: '#0f172a',
  me: '#0ea5e9',
  checkIn: '#10b981',
  checkOut: '#f43f5e',
};

/** Tehran, when there is nothing to centre on yet. */
const DEFAULT_CENTER: [number, number] = [35.6997, 51.338];

/**
 * OpenStreetMap's public tiles, as in Tesmino. They are rate-limited and can
 * be slow from Iran; point NEXT_PUBLIC_MAP_TILE_URL at a mirror or a
 * commercial provider for production use.
 */
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function dotIcon(L: typeof Leaflet, color: string, size = 16) {
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.45)"></span>`,
  });
}

export function AttendanceMap({
  circle,
  points = [],
  picker,
  className = 'h-72',
  label = 'نقشه',
}: {
  circle?: MapCircle | null;
  points?: MapPoint[];
  /** Makes the map a location picker; the circle follows the pin. */
  picker?: {
    value: { lat: number; lng: number } | null;
    onChange: (value: { lat: number; lng: number }) => void;
  };
  className?: string;
  label?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const leaflet = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layers = useRef<Leaflet.LayerGroup | null>(null);
  const pin = useRef<Leaflet.Marker | null>(null);
  /** How many places the current framing covers. */
  const framed = useRef(0);
  /** Last position the viewer picked on the map itself. */
  const picked = useRef<{ lat: number; lng: number } | null>(null);
  const onPick = useRef(picker?.onChange);
  onPick.current = picker?.onChange;
  const pick = (value: { lat: number; lng: number }) => {
    picked.current = value;
    onPick.current?.(value);
  };
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const [ready, setReady] = useState(false);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;

    import('leaflet').then((module) => {
      const L = (module as unknown as { default?: typeof Leaflet }).default ?? (module as typeof Leaflet);
      if (cancelled || !container.current || map.current) return;

      leaflet.current = L;
      map.current = L.map(container.current, { zoomControl: true }).setView(DEFAULT_CENTER, 11);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map.current);
      layers.current = L.layerGroup().addTo(map.current);

      if (onPick.current) {
        map.current.on('click', (e: Leaflet.LeafletMouseEvent) =>
          pickRef.current({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }),
        );
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      pin.current = null;
    };
  }, []);

  // A map created inside a modal or a just-expanded row measures 0×0 at first.
  useEffect(() => {
    if (!ready || !container.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => map.current?.invalidateSize());
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [ready]);

  const pickerAt = picker?.value;

  // Redraw the overlays whenever the data changes.
  useEffect(() => {
    const L = leaflet.current;
    if (!ready || !L || !map.current || !layers.current) return;
    layers.current.clearLayers();
    const bounds: Leaflet.LatLngExpression[] = [];

    const center = pickerAt ?? (circle ? { lat: circle.lat, lng: circle.lng } : null);
    if (circle || (pickerAt && picker)) {
      const at = center!;
      L.circle([at.lat, at.lng], {
        radius: circle?.radius ?? 100,
        color: MAP_COLORS.radius,
        weight: 2,
        fillOpacity: 0.12,
      }).addTo(layers.current);
      bounds.push([at.lat, at.lng]);
      if (!picker) {
        const marker = L.marker([at.lat, at.lng], { icon: dotIcon(L, MAP_COLORS.workplace), keyboard: false });
        if (circle?.label) marker.bindTooltip(circle.label, { direction: 'top', offset: [0, -8] });
        marker.addTo(layers.current);
      }
    }

    for (const point of points) {
      L.marker([point.lat, point.lng], { icon: dotIcon(L, point.color), keyboard: false })
        .bindTooltip(point.label, {
          permanent: point.permanent,
          direction: point.labelSide ?? 'top',
          offset: [0, point.labelSide === 'bottom' ? 8 : -8],
        })
        .addTo(layers.current);
      bounds.push([point.lat, point.lng]);
    }

    // The picker pin lives outside the group so dragging it isn't interrupted.
    if (picker) {
      if (pickerAt && !pin.current) {
        pin.current = L.marker([pickerAt.lat, pickerAt.lng], {
          icon: dotIcon(L, MAP_COLORS.radius, 22),
          draggable: true,
          title: 'برای جابه‌جایی بکشید',
        }).addTo(map.current);
        pin.current.on('dragend', () => {
          const p = pin.current!.getLatLng();
          pickRef.current({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
        });
      } else if (pickerAt && pin.current) {
        pin.current.setLatLng([pickerAt.lat, pickerAt.lng]);
      } else if (!pickerAt && pin.current) {
        pin.current.remove();
        pin.current = null;
      }
    }

    // A position typed in or located from outside the map: go there. One the
    // viewer just clicked or dragged to stays where they put it.
    const external =
      picker &&
      pickerAt &&
      (picked.current?.lat !== pickerAt.lat || picked.current?.lng !== pickerAt.lng);
    if (external) {
      map.current.setView([pickerAt.lat, pickerAt.lng], Math.max(map.current.getZoom(), 16));
      picked.current = pickerAt;
      framed.current = bounds.length;
    }

    // Frame the content when something new appears (e.g. "you are here");
    // otherwise leave the viewer's pan and zoom alone.
    if (!external && bounds.length > framed.current) {
      if (bounds.length === 1) {
        map.current.setView(bounds[0], 16);
      } else {
        map.current.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 17 });
      }
      framed.current = bounds.length;
    }
  }, [ready, circle?.lat, circle?.lng, circle?.radius, circle?.label, pickerAt?.lat, pickerAt?.lng, JSON.stringify(points)]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={container}
      dir="ltr"
      role="region"
      aria-label={label}
      className={`isolate z-0 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${className}`}
    />
  );
}
