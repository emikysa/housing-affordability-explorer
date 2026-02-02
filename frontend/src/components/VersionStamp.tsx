// Build timestamp injected at compile time via vite.config.ts
const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || 'dev'

interface VersionStampProps {
  className?: string
}

export default function VersionStamp({ className = '' }: VersionStampProps) {
  return (
    <span className={`text-xs text-gray-400 font-normal ml-2 ${className}`}>
      ver. {BUILD_TIME}
    </span>
  )
}
