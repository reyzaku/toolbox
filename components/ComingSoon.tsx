interface ComingSoonProps {
  icon: string
  label: string
  description: string
  features: string[]
  color: string
}

export default function ComingSoon({ icon, label, description, features, color }: ComingSoonProps) {
  return (
    <div className="px-6 py-10 md:px-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: `${color}20` }}
          >
            {icon}
          </span>
          {label}
        </h1>
        <p className="text-sm text-[#666] mt-1">{description}</p>
      </div>

      <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🔧</div>
        <h2 className="text-lg font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-sm text-[#555] mb-6 max-w-xs mx-auto">
          This tool is in development. Here&apos;s what it will include:
        </p>
        <ul className="text-sm text-[#666] space-y-2 text-left max-w-xs mx-auto">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span style={{ color }} className="mt-0.5">→</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
