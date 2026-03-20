export default function CheckInHistory({ weeklyCompleted = [] }) {
  const days = Array.isArray(weeklyCompleted) ? weeklyCompleted.slice(0, 7) : []

  return (
    <div className="flex items-center justify-between gap-2">
      {Array.from({ length: 7 }).map((_, i) => {
        const completed = Boolean(days[i])
        return (
          <div
            key={i}
            className={[
              'h-3.5 w-3.5 rounded-full border',
              completed ? 'bg-sage border-sage' : 'bg-softgray border-softgray',
            ].join(' ')}
            aria-label={completed ? 'completed' : 'pending'}
            title={completed ? 'completed' : 'pending'}
          />
        )
      })}
    </div>
  )
}

