function SpotCard({
  t,
  img,
  alt,
  fill = false
}) {
  return <figure className="overflow-hidden rounded-[20px] border-2 border-ink bg-card shadow-soft">
      {
    /* fixed 4:3 frame so the three cards line up */
  }
      {fill ? <div className="aspect-[4/3]">
          <img src={img} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        </div> : <div className="flex aspect-[4/3] items-center justify-center p-2">
          <img src={img} alt={alt} loading="lazy" className="max-h-full max-w-full" />
        </div>}
      <figcaption className="px-4 py-3 font-semibold text-ink">{t}</figcaption>
    </figure>;
}
export {
  SpotCard
};
