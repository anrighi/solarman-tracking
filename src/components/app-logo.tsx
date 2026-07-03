type AppLogoProps = {
  className?: string
}

export function AppLogo({ className = 'h-10 w-10' }: AppLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Solar Tracking"
      className={className}
      width={40}
      height={40}
    />
  )
}
