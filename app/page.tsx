import { Suspense } from "react"
import { HomeView } from "@/components/home-view"

// Opt this route segment out of instant navigation validation for dynamic 3D WebGL canvas
export const instant = false

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <HomeView />
    </Suspense>
  )
}
