'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const LocaleContext = createContext({
  locale: 'en-US',
  timezone: 'UTC',
  country: null,
  countries: [],
  loading: true,
  setLocale: () => { },
  formatDate: (date) => date.toString(),
})

export const LocaleProvider = ({ children }) => {
  const [locale, setLocale] = useState('en-US')
  const [timezone, setTimezone] = useState('UTC')
  const [country, setCountry] = useState(null)
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initLocale = async () => {
      setLoading(true)
      try {
        // 1. Fetch all countries dynamically from REST Countries
        const countriesRes = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags')
        const rawCountries = await countriesRes.json()

        const processedCountries = rawCountries.map(c => ({
          name: c.name.common,
          code: c.cca2,
          flag: c.flags.svg || c.flags.png,
          dialCode: c.idd.root + (c.idd.suffixes?.[0] || '')
        })).sort((a, b) => a.name.localeCompare(b.name))

        setCountries(processedCountries)

        // 2. Detect User Location and timezone from IP
        try {
          const geoRes = await fetch('https://ipapi.co/json/')
          const geoData = await geoRes.json()

          if (geoData && !geoData.error) {
            if (geoData.timezone) setTimezone(geoData.timezone)
            if (geoData.country_code) {
              const detectedCountry = processedCountries.find(c => c.code === geoData.country_code)
              if (detectedCountry) setCountry(detectedCountry)
            }
            if (geoData.languages) {
              const primaryLang = geoData.languages.split(',')[0]
              setLocale(primaryLang)
            }
          }
        } catch (e) {
          console.warn("Geo detection failed, using browser defaults")
          // Fallback to browser
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
          const browserLang = navigator.language || 'en-US'
          setLocale(browserLang)
        }

      } catch (error) {
        console.error("Locale initialization failed:", error)
      } finally {
        setLoading(false)
      }
    }

    initLocale()
  }, [])

  const formatDate = (date, options = {}) => {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      ...options
    }).format(new Date(date))
  }

  return (
    <LocaleContext.Provider value={{ locale, timezone, country, countries, loading, setLocale, formatDate, setCountry }}>
      {children}
    </LocaleContext.Provider>
  )
}

export const useLocale = () => useContext(LocaleContext)
