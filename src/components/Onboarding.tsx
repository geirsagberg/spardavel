import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDrag } from '@use-gesture/react'

type Slide = {
  title: string
  subtitle: string
  image: string
  imageAlt: string
}

const slides: Slide[] = [
  {
    title: 'Every Choice Matters',
    subtitle: 'Track what you buy. Celebrate what you skip.',
    image: '/images/onboarding-1.jpg',
    imageAlt: 'Person at a choice crossroads',
  },
  {
    title: 'Your Money, Your Story',
    subtitle: '💸 Bought or 💪 Skipped',
    image: '/images/onboarding-2.jpg',
    imageAlt: 'Two paths showing buying and saving',
  },
  {
    title: 'Watch Your Savings Grow',
    subtitle: 'See the impact of small wins',
    image: '/images/onboarding-3.jpg',
    imageAlt: 'Growth and compound interest visualization',
  },
  {
    title: 'Ready to Start?',
    subtitle: 'Make every choice count',
    image: '/images/onboarding-4.jpg',
    imageAlt: 'Dashboard preview',
  },
]

const SWIPE_THRESHOLD = 80
const VELOCITY_THRESHOLD = 0.5

export function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [dragState, setDragState] = useState({ offset: 0, isDragging: false })
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)
  const navigate = useNavigate()

  const handleComplete = () => {
    localStorage.setItem('spardavel_onboarding_complete', 'true')
    navigate({ to: '/' })
  }

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setSlideDirection('left')
      setCurrentSlide(currentSlide + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      setSlideDirection('right')
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const slide = slides[currentSlide]
  const isLastSlide = currentSlide === slides.length - 1
  const hasNext = currentSlide < slides.length - 1
  const hasPrev = currentSlide > 0

  const bind = useDrag(
    ({ movement: [mx], velocity: [vx], active, event }) => {
      event?.preventDefault()
      
      if (active) {
        const isSwipingRight = mx > 0
        const isSwipingLeft = mx < 0

        if ((isSwipingRight && !hasPrev) || (isSwipingLeft && !hasNext)) {
          return
        }

        setSlideDirection(null)
        setDragState({ offset: mx, isDragging: true })
      } else {
        const absOffset = Math.abs(mx)
        const absVelocity = Math.abs(vx)
        const shouldNavigate = absOffset > SWIPE_THRESHOLD || absVelocity > VELOCITY_THRESHOLD

        if (shouldNavigate) {
          if (mx > 0 && hasPrev) {
            setSlideDirection('right')
            handlePrev()
          } else if (mx < 0 && hasNext) {
            setSlideDirection('left')
            handleNext()
          }
        }

        setDragState({ offset: 0, isDragging: false })
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
      threshold: 10,
    }
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 flex flex-col overflow-hidden">
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          className="btn btn-ghost btn-sm btn-circle" 
          onClick={handleSkip}
          aria-label="Skip onboarding"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center p-6 max-w-2xl mx-auto w-full overflow-hidden" style={{ paddingTop: 'max(4vh, 48px)' }}>
        {/* Swipeable content */}
        <div 
          {...bind()}
          key={currentSlide}
          className={`touch-none select-none ${
            slideDirection === 'left' ? 'slide-in-from-right' : 
            slideDirection === 'right' ? 'slide-in-from-left' : ''
          }`}
          style={{
            transform: dragState.isDragging ? `translateX(${dragState.offset}px)` : 'translateX(0)',
            transition: dragState.isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          {/* Image */}
          <div className="w-full max-w-xl mb-4 rounded-2xl bg-base-200 overflow-hidden" style={{ height: 'min(50vh, 500px)' }}>
            <img 
              src={slide.image} 
              alt={slide.imageAlt}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>

          {/* Text content - viewport-based height to prevent layout shifts */}
          <div className="text-center space-y-4 mb-6 h-[15vh] flex flex-col justify-center px-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-base-content leading-tight">
              {slide.title}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-base-content/70 leading-relaxed">
              {slide.subtitle}
            </p>
          </div>
        </div>

        {/* Progress dots - viewport-based height */}
        <div className="flex gap-2 mb-4 h-[4vh] items-center">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-base-content/20 hover:bg-base-content/40'
              }`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons - viewport-based height */}
        <div className="flex gap-4 w-full max-w-md h-[8vh]">
          {currentSlide > 0 && (
            <button
              className="btn btn-outline flex-1"
              onClick={handlePrev}
            >
              Back
            </button>
          )}
          <button
            className={`btn flex-1 ${
              isLastSlide
                ? 'btn-primary'
                : 'btn-ghost'
            }`}
            onClick={handleNext}
          >
            {isLastSlide ? "Let's Go!" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
