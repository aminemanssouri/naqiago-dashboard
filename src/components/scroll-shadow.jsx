"use client"

import * as React from "react"

export function ScrollShadow({ children, className = "" }) {
  const scrollRef = React.useRef(null)
  const [scrollState, setScrollState] = React.useState({
    canScrollLeft: false,
    canScrollRight: false,
  })

  const checkScroll = React.useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setScrollState({
        canScrollLeft: scrollLeft > 0,
        canScrollRight: scrollLeft < scrollWidth - clientWidth - 1,
      })
    }
  }, [])

  React.useEffect(() => {
    checkScroll()
    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll)
      return () => scrollElement.removeEventListener('scroll', checkScroll)
    }
  }, [checkScroll])

  // Check scroll on resize
  React.useEffect(() => {
    const handleResize = () => checkScroll()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [checkScroll])

  return (
    <div className={`relative ${className}`}>
      {/* Left shadow */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent z-[6] pointer-events-none transition-opacity duration-200 ${
          scrollState.canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Right shadow */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent z-[6] pointer-events-none transition-opacity duration-200 ${
          scrollState.canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        {children}
      </div>
    </div>
  )
}