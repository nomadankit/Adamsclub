import { ExploreGear } from "../ExploreGear"
import { ThemeProvider } from "../ThemeProvider"

export default function ExploreGearExample() {
  return (
    <ThemeProvider defaultTheme="light">
      <ExploreGear />
    </ThemeProvider>
  )
}