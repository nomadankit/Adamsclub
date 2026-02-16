import { GearCard } from "../GearCard"
import kayakImage from "@assets/generated_images/Kayak_fleet_product_photo_b6bc55b7.png"

export default function GearCardExample() {
  return (
    <div className="p-4 max-w-sm mx-auto">
      <GearCard 
        title="Kayaks"
        image={kayakImage}
        onClick={() => console.log("Kayaks clicked")}
      />
    </div>
  )
}