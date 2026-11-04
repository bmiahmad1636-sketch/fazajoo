/**
 * Viewport-only city journey for the listing map.
 * It never writes coordinates or creates a property marker.
 * Returns a cancellation callback so a second destination or user action
 * cannot accidentally resume an earlier two-stage animation.
 */
export function animateCityFlight(map, center, { zoom = 12, reducedMotion = false } = {}) {
  if (!map || !Array.isArray(center) || center.length !== 2 ||
    !center.every((coordinate) => Number.isFinite(coordinate))) {
    return () => {};
  }

  map.stop();
  const destination = [...center];
  let cancelled = false;
  let waitingForOverview = false;
  const onOverviewEnd = () => {
    map.off("moveend", onOverviewEnd);
    waitingForOverview = false;
    if (!cancelled) {
      map.flyTo({ center: destination, zoom, duration: 1400, curve: 1.45, essential: false });
    }
  };

  if (reducedMotion) {
    map.jumpTo({ center: destination, zoom });
  } else {
    const currentZoom = Number(map.getZoom());
    const overviewZoom = Math.min(Number.isFinite(currentZoom) ? currentZoom : 5, 5);
    if (currentZoom > overviewZoom + 0.4) {
      waitingForOverview = true;
      map.on("moveend", onOverviewEnd);
      map.easeTo({ zoom: overviewZoom, duration: 650, essential: false });
    } else {
      onOverviewEnd();
    }
  }

  return () => {
    if (cancelled) return;
    cancelled = true;
    if (waitingForOverview) map.off("moveend", onOverviewEnd);
    map.stop();
  };
}
