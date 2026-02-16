import { GearCard } from "./GearCard"
import kayakImage from "@assets/generated_images/Kayak_fleet_product_photo_b6bc55b7.png"
import campingImage from "@assets/generated_images/Camping_gear_product_photo_8c5629b2.png"
import { motion } from "framer-motion"

//todo: remove mock functionality - this will be replaced with real gear data
const gearCategories = [
  {
    title: "Kayaks",
    image: kayakImage
  },
  {
    title: "Camping",
    image: campingImage
  },
  {
    title: "Hiking",
    image: campingImage // Placeholder
  },
  {
    title: "Climbing",
    image: kayakImage // Placeholder
  },
  {
    title: "Fishing",
    image: kayakImage // Placeholder
  },
  {
    title: "Winter Sports",
    image: campingImage // Placeholder
  }
]

export function ExploreGear() {
  const handleGearClick = (title: string) => {
    console.log(`${title} gear clicked`)
  }

  return (
    <section className="py-20 px-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold font-['Poppins'] text-slate-900 dark:text-white mb-4">
              Explore Our Gear
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Premium equipment for every adventure. Rent top-quality gear without the hassle of ownership.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {gearCategories.map((category, index) => (
            <GearCard
              key={category.title}
              title={category.title}
              image={category.image}
              onClick={() => handleGearClick(category.title)}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}