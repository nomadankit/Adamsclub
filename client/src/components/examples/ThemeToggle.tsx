import { ThemeToggle } from "../ThemeToggle"
import { ThemeProvider } from "../ThemeProvider"

export default function ThemeToggleExample() {
  return (
    <ThemeProvider defaultTheme="light">
      <div className="p-4 flex items-center justify-center">
        <ThemeToggle />
      </div>
    </ThemeProvider>
  )
}