'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import i18n from '@/lib/i18n'
import { useAuth } from '@/context/AuthContext'

const LocaleContext = createContext({
  locale: 'en',
  timezone: 'UTC',
  country: null,
  countries: [],
  loading: true,
  setLocale: () => { },
  formatDate: (date) => date.toString(),
})

export const LocaleProvider = ({ children }) => {
  const [locale, setLocaleState] = useState('en')
  const [timezone, setTimezone] = useState('UTC')
  const [country, setCountry] = useState(null)
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Map settings language name to code
  const getLangCode = (pref) => {
    const langMap = {
      'English': 'en',
      'German': 'de',
      'Hindi': 'hi',
      'Tamil': 'ta',
      'Spanish': 'en',
      'French': 'en',
      'Japanese': 'en',
      'Mandarin': 'en'
    }
    return langMap[pref] || 'en'
  }

  // Handle manual/programmatic locale changes
  const setLocale = (newLocale) => {
    const cleanLocale = newLocale.split('-')[0].toLowerCase()
    i18n.changeLanguage(cleanLocale)
    setLocaleState(cleanLocale)
  }

  // Synchronize language when authenticated user's profile preferences load or change.
  // This runs synchronously so it applies before the slow geo-IP fetch below can overwrite it.
  useEffect(() => {
    if (user?.languagePreference) {
      const code = getLangCode(user.languagePreference)
      i18n.changeLanguage(code)
      setLocaleState(code)
    }
  }, [user?.languagePreference])

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

        // Only auto-detect if the user does NOT have a saved preference yet
        if (!user?.languagePreference) {
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
                const primaryLang = geoData.languages.split(',')[0].split('-')[0].toLowerCase()
                setLocale(primaryLang)
              }
            }
          } catch (e) {
            console.warn("Geo detection failed, using browser defaults")
            // Fallback to browser
            setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
            const browserLang = (navigator.language || 'en').split('-')[0].toLowerCase()
            setLocale(browserLang)
          }
        } else {
          // User preference exists, just fetch geo details for context (e.g. timezone) if not already set
          try {
            const geoRes = await fetch('https://ipapi.co/json/')
            const geoData = await geoRes.json()
            if (geoData && !geoData.error) {
              if (geoData.timezone) setTimezone(geoData.timezone)
              if (geoData.country_code) {
                const detectedCountry = processedCountries.find(c => c.code === geoData.country_code)
                if (detectedCountry) setCountry(detectedCountry)
              }
            }
          } catch (e) {
            setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
          }
        }

      } catch (error) {
        console.error("Locale initialization failed:", error)
      } finally {
        setLoading(false)
      }
    }

    initLocale()
  }, [user])

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

