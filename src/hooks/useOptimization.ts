import { useCallback, useEffect, useRef, useState, useMemo } from 'react'

const isDev = process.env.NODE_ENV === 'development'

/**
 * Custom hook for debouncing values
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook for throttling callback functions
 * @param callback - The callback function to throttle
 * @param delay - The delay in milliseconds
 * @returns The throttled callback function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now())
  const timeout = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    ((...args) => {
      const now = Date.now()
      const timeSinceLastRun = now - lastRun.current

      if (timeSinceLastRun >= delay) {
        callback(...args)
        lastRun.current = now
      } else {
        if (timeout.current) clearTimeout(timeout.current)
        timeout.current = setTimeout(() => {
          callback(...args)
          lastRun.current = Date.now()
        }, delay - timeSinceLastRun)
      }
    }) as T,
    [callback, delay]
  )
}

/**
 * Custom hook for intersection observer (lazy loading)
 * @param options - Intersection observer options
 * @returns ref and visibility state
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [options])

  return [ref, isIntersecting]
}

/**
 * Custom hook for memoizing expensive calculations with dependencies
 * @param factory - The factory function that performs the calculation
 * @param deps - The dependencies array
 * @returns The memoized value
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps)
}

/**
 * Custom hook for stable callbacks (prevents unnecessary re-renders)
 * @param callback - The callback function
 * @returns A stable reference to the callback
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  )
}

/**
 * Custom hook for detecting if component is mounted
 * @returns Whether the component is mounted
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  return isMounted
}

/**
 * Custom hook for preventing hydration mismatches in SSR
 * @returns Whether the component has been hydrated
 */
export function useIsHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

/**
 * Custom hook for managing previous values
 * @param value - The current value
 * @returns The previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  
  useEffect(() => {
    ref.current = value
  }, [value])
  
  return ref.current
}

/**
 * Custom hook for window size with debouncing
 * @returns The current window dimensions
 */
export function useWindowSize(debounceDelay: number = 150) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  const debouncedSize = useDebounce(windowSize, debounceDelay)

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return debouncedSize
}

/**
 * Custom hook for local storage with SSR support
 * @param key - The storage key
 * @param initialValue - The initial value
 * @returns The stored value and setter function
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      if (isDev) {
        console.error(`Error loading localStorage key "${key}":`, error)
      }
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        if (isDev) {
          console.error(`Error setting localStorage key "${key}":`, error)
        }
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue]
}