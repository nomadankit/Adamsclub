import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

interface GearCardProps {
  title: string
  image: string
  onClick: () => void
  index?: number
}

export function GearCard({ title, image, onClick, index = 0 }: GearCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
    >
      <Card
        className="group cursor-pointer overflow-hidden border-0 shadow-md hover:shadow-xl transition-shadow duration-300 rounded-xl"
        onClick={onClick}
        data-testid={`card-gear-${title.toLowerCase()}`}
      >
        <CardContent className="p-0 relative aspect-[4/3] overflow-hidden">
          <motion.img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.6 }}
          />

          {/* Main Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <motion.div
              initial={{ x: 0 }}
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <h3
                className="text-white font-bold text-2xl font-['Poppins'] mb-2 tracking-wide"
                data-testid={`text-gear-title-${title.toLowerCase()}`}
              >
                {title}
              </h3>
            </motion.div>

            <motion.div
              className="flex items-center gap-2 text-white/90 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out"
            >
              <span className="text-sm font-medium uppercase tracking-wider">View Collection</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}