"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, LayoutDashboard } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { SailboatLogo } from "@/components/dashboard-preloader"
import { cn } from "@/lib/utils"

// Dynamically import ShaderGradientCanvas and ShaderGradient with SSR disabled
const ShaderGradientCanvas = dynamic(
  () =>
    import("@shadergradient/react").then((mod) => mod.ShaderGradientCanvas),
  { ssr: false }
) as React.ComponentType<any>

const ShaderGradient = dynamic(
  () => import("@shadergradient/react").then((mod) => mod.ShaderGradient),
  {
    ssr: false,
  }
) as React.ComponentType<any>

export function HomeView() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black text-white">
      {/* Floating Navbar with Blurred Background, Margins, and 20px Curved Corners */}
      <header className="fixed top-3 sm:top-4 inset-x-4 sm:inset-x-8 max-w-6xl mx-auto z-50 flex h-14 items-center justify-between rounded-[20px] border border-white/15 bg-black/50 px-4 sm:px-5 backdrop-blur-md shadow-xl">
        {/* Left: Icon used in sidebar & Brand Title */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex aspect-square size-8 sm:size-8.5 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-white/20 bg-black/60 shadow-sm transition-transform group-hover:scale-105">
            <Image
              src="/goldraft.png"
              alt="GoldRaft"
              width={34}
              height={34}
              className="size-full object-cover"
              priority
            />
          </div>
          <span className="font-semibold text-sm sm:text-base tracking-tight text-white group-hover:text-white/90">
            GoldRaft
          </span>
        </Link>

        {/* Right: Dashboard Button - Sleek White pill button */}
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "default" }),
            "h-8 sm:h-8.5 px-3.5 sm:px-4 gap-1.5 rounded-full bg-white text-black hover:bg-white/90 text-xs sm:text-sm font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-95"
          )}
        >
          <LayoutDashboard className="size-3.5" />
          <span>Dashboard</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {/* 3D Shader Gradient Canvas as Fullscreen Background */}
      {/* pointer-events-none & pointerEvents="none" prevents mouse wheel / scrolling from zooming out the 3D camera */}
      {mounted && (
        <React.Suspense fallback={null}>
          <div className="absolute inset-0 z-0 h-full w-full pointer-events-none">
            <ShaderGradientCanvas
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
              fov={45}
              pixelDensity={1}
            >
              <ShaderGradient
                animate="on"
                axesHelper="on"
                brightness={1.1}
                cAzimuthAngle={180}
                cDistance={3.9}
                cPolarAngle={115}
                cameraZoom={1}
                zoomOut={false}
                color1="#5606ff"
                color2="#fe8989"
                color3="#000000"
                destination="onCanvas"
                embedMode="off"
                envPreset="city"
                format="gif"
                fov={45}
                frameRate={10}
                gizmoHelper="hide"
                grain="off"
                lightType="3d"
                pixelDensity={1}
                positionX={-0.5}
                positionY={0.1}
                positionZ={0}
                range="disabled"
                rangeEnd={40}
                rangeStart={0}
                reflection={0.1}
                rotationX={0}
                rotationY={0}
                rotationZ={235}
                shader="defaults"
                type="waterPlane"
                uAmplitude={0}
                uDensity={1.1}
                uFrequency={5.5}
                uSpeed={0.1}
                uStrength={2.4}
                uTime={0.2}
                wireframe={false}
              />
            </ShaderGradientCanvas>
          </div>
        </React.Suspense>
      )}

      {/* Foreground Hero Content with backdrop blur and link to dashboard */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-4 pt-20 text-center select-none pointer-events-none max-w-3xl">
        {/* Sailboat SVG Icon from Dashboard Preloader */}
        <div className="flex items-center justify-center">
          <SailboatLogo className="w-16 sm:w-20 md:w-24 h-auto text-white fill-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]" />
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-2xl">
          GoldRaft is on its wave
        </h1>

        <p className="max-w-lg text-sm sm:text-base md:text-lg text-white/80 drop-shadow">
          Ride the bullion markets with real-time MCX benchmark intelligence, delivery spread analytics, and automated margin calculations.
        </p>

        <div className="pt-2 pointer-events-auto">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-2 rounded-full bg-white text-black hover:bg-white/90 h-12 px-8 text-base font-semibold shadow-2xl transition-all hover:scale-105 active:scale-95"
            )}
          >
            <LayoutDashboard className="size-5" />
            Explore Dashboard
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </div>
    </main>
  )
}
