interface PauseMarker {
  position: number;
  duration: number;
}

export function parsePauseMarkers(text: string): string {
  return text.replace(
    /\[pause\s+(\d+(?:\.\d+)?)(s|ms)\]/gi,
    (_match, value, unit) => {
      const duration = unit === 'ms' ? `${value}ms` : `${value}s`;
      return `<break time="${duration}"/>`;
    }
  );
}

export function stripPauseMarkers(text: string): string {
  return text.replace(/\[pause\s+(\d+(?:\.\d+)?)(s|ms)\]/gi, '. ');
}

function extractPauseMarkers(text: string): PauseMarker[] {
  const markers: PauseMarker[] = [];
  const regex = /\[pause\s+(\d+(?:\.\d+)?)(s|ms)\]/gi;
  let match: RegExpExecArray | null = null;

  match = regex.exec(text);
  while (match !== null) {
    const value = parseFloat(match[1]);
    const unit = match[2];
    const durationMs = unit === 's' ? value * 1000 : value;

    markers.push({
      position: match.index,
      duration: durationMs,
    });

    match = regex.exec(text);
  }

  return markers;
}
