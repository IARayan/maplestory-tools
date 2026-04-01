type Props = {
  stars: number
  max?: number
}

export function StarRow({ stars, max = 30 }: Props) {
  const n = Math.max(0, Math.min(max, stars))
  return (
    <div className="star-row" aria-label={`${n} stars`}>
      {Array.from({ length: Math.ceil(max / 5) }, (_, groupIndex) => {
        const start = groupIndex * 5
        const end = Math.min(start + 5, max)

        return (
          <span key={groupIndex} className="star-group">
            {Array.from({ length: end - start }, (_, offset) => {
              const i = start + offset
              return (
                <span
                  key={i}
                  className={i < n ? 'star on' : 'star off'}
                  aria-hidden
                >
                  ★
                </span>
              )
            })}
          </span>
        )
      })}
    </div>
  )
}
