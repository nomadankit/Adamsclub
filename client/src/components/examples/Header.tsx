import { Header } from "../Header"
import { ThemeProvider } from "../ThemeProvider"

export default function HeaderExample() {
  return (
    <ThemeProvider defaultTheme="light">
      <div className="min-h-[100px]">
        <Header />
      </div>
    </ThemeProvider>
  )
}