const DROPPED = /[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu;

export function slugOf(heading: string): string {
  return heading.toLowerCase().replace(DROPPED, "").replaceAll(" ", "-");
}

export function uniqueSlugsOf(headings: readonly string[]): readonly string[] {
  const counts = new Map<string, number>();
  return headings.map((heading) => {
    const base = slugOf(heading);
    let slug = base;
    while (counts.has(slug)) {
      const count = (counts.get(base) ?? 0) + 1;
      counts.set(base, count);
      slug = `${base}-${count}`;
    }
    counts.set(slug, 0);
    return slug;
  });
}
