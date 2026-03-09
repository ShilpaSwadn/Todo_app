'use client'

import { useState, useEffect } from 'react'
import { FiPhone, FiChevronDown } from 'react-icons/fi'
import { countries } from '@/lib/data/countries'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

export default function PhoneInput({ value, onChange, error, className, disabled = false }) {
    const [selectedCountry, setSelectedCountry] = useState(countries[0]) // Default to India
    const [isOpen, setIsOpen] = useState(false)
    const [phoneNumber, setPhoneNumber] = useState(value || '')

    useEffect(() => {
        // If value already starts with a +, try to detect country
        if (value && value.startsWith('+')) {
            for (const country of countries) {
                if (value.startsWith(country.dialCode)) {
                    setSelectedCountry(country)
                    setPhoneNumber(value.replace(country.dialCode, ''))
                    break
                }
            }
        }
    }, [value])

    const handleCountrySelect = (country) => {
        if (disabled) return
        setSelectedCountry(country)
        setIsOpen(false)
        // Notify parent of the full number
        const fullNumber = country.dialCode + phoneNumber.replace(/\D/g, '')
        onChange(fullNumber, phoneNumber.replace(/\D/g, ''), country.code)
    }

    const handlePhoneChange = (e) => {
        if (disabled) return
        const val = e.target.value.replace(/\D/g, '').slice(0, selectedCountry.maxLength)
        setPhoneNumber(val)
        const fullNumber = selectedCountry.dialCode + val
        onChange(fullNumber, val, selectedCountry.code)
    }

    return (
        <div className={`relative ${className}`}>
            <div className={`flex ${disabled ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                {/* Country Selector */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        disabled={disabled}
                        className={`flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-2 border-r-0 border-gray-200 dark:border-gray-700 rounded-l-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors h-full ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <span className="text-sm font-medium dark:text-gray-300">{selectedCountry.dialCode}</span>
                        {!disabled && <FiChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                    </button>

                    {isOpen && !disabled && (
                        <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                            {countries.map((country) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => handleCountrySelect(country)}
                                    className="w-full flex items-center justify-between px-4 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-300 transition-colors"
                                >
                                    <span>{country.name}</span>
                                    <span className="text-gray-400 font-mono text-xs">{country.dialCode}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Number Input */}
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        disabled={disabled}
                        readOnly={disabled}
                        maxLength={selectedCountry.maxLength}
                        className={`w-full pl-9 pr-3 py-2 border-2 ${error ? 'border-red-500 pr-10' : 'border-gray-200 dark:border-gray-700'} rounded-r-lg focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white transition-colors text-sm h-full ${disabled ? 'cursor-not-allowed' : 'cursor-text'}`}
                        placeholder={`Enter ${selectedCountry.maxLength}-digit number`}
                    />
                </div>
            </div>

            {error && (
                <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
            )}
        </div>
    )
}
