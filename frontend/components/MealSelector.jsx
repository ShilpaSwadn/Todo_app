'use client'

import React, { useState, useMemo } from 'react'
import {
    FiX, FiPlus, FiArrowRight, FiShield, FiSlash,
    FiShoppingBag, FiChevronLeft, FiAlertTriangle, FiSearch
} from 'react-icons/fi'
import { useTranslation } from 'react-i18next'

const CORE_MEAL_TYPES = [
    { id: 'REGULAR', icon: '🍽️', forbidden: [] },
    { id: 'JAIN', icon: '🕍', forbidden: ['Onion', 'Garlic', 'Potato', 'Ginger', 'Root Vegetables'] },
    { id: 'VEGAN', icon: '🌱', forbidden: ['Meat', 'Chicken', 'Seafood', 'Dairy', 'Eggs', 'Butter', 'Cream'] },
    { id: 'DIABETIC', icon: '📉', forbidden: ['Sugar', 'Honey', 'High Carb'] },
    { id: 'BABY', icon: '👶', forbidden: ['Salt', 'Whole Nuts', 'Hard Textures'] }
]

export const DISHES = [
    // ================= REGULAR =================
    {
        id: 'R1',
        name: 'Paneer Butter Masala',
        ingredients: ['Paneer', 'Butter', 'Cream', 'Onion', 'Garlic'],
        description: 'Rich creamy curry prepared with traditional spices.',
        mealType: 'REGULAR'
    },
    {
        id: 'R2',
        name: 'Chicken Curry with Rice',
        ingredients: ['Chicken', 'Rice', 'Onion', 'Garlic', 'Spices'],
        description: 'Classic non-veg meal with aromatic spices.',
        mealType: 'REGULAR'
    },
    {
        id: 'R3',
        name: 'Vegetable Fried Rice',
        ingredients: ['Rice', 'Carrot', 'Beans', 'Onion', 'Garlic'],
        description: 'Stir-fried rice with fresh vegetables.',
        mealType: 'REGULAR'
    },

    // ================= JAIN =================
    {
        id: 'J1',
        name: 'Jain Dal & Steamed Rice',
        ingredients: ['Lentils', 'Turmeric', 'Cumin', 'Rice'],
        description: 'Simple Jain-style dal without onion or garlic.',
        mealType: 'JAIN'
    },
    {
        id: 'J2',
        name: 'Jain Paneer Tomato Curry',
        ingredients: ['Paneer', 'Tomato', 'Cashew'],
        description: 'Paneer cooked in Jain-approved tomato gravy.',
        mealType: 'JAIN'
    },
    {
        id: 'J3',
        name: 'Bottle Gourd Sabzi with Roti',
        ingredients: ['Bottle Gourd', 'Wheat Flour', 'Spices'],
        description: 'Light vegetable preparation suitable for Jain diet.',
        mealType: 'JAIN'
    },

    // ================= VEGAN =================
    {
        id: 'V1',
        name: 'Quinoa & Avocado Bowl',
        ingredients: ['Quinoa', 'Avocado', 'Chickpeas', 'Tomato'],
        description: 'Plant-based bowl rich in protein and healthy fats.',
        mealType: 'VEGAN'
    },
    {
        id: 'V2',
        name: 'Vegan Vegetable Stir Fry',
        ingredients: ['Broccoli', 'Zucchini', 'Bell Pepper', 'Soy Sauce'],
        description: 'Oil-light sautéed vegetables with Asian flavors.',
        mealType: 'VEGAN'
    },
    {
        id: 'V3',
        name: 'Tofu Brown Rice Bowl',
        ingredients: ['Tofu', 'Brown Rice', 'Green Beans'],
        description: 'High-protein vegan meal with whole grains.',
        mealType: 'VEGAN'
    },

    // ================= DIABETIC =================
    {
        id: 'D1',
        name: 'Grilled Fish with Greens',
        ingredients: ['Fish', 'Spinach', 'Olive Oil'],
        description: 'Low-carb meal with healthy fats.',
        mealType: 'DIABETIC'
    },
    {
        id: 'D2',
        name: 'Millet Roti with Veg Curry',
        ingredients: ['Millet Flour', 'Vegetables'],
        description: 'Low glycemic meal ideal for blood sugar control.',
        mealType: 'DIABETIC'
    },
    {
        id: 'D3',
        name: 'Paneer & Salad Plate',
        ingredients: ['Paneer', 'Lettuce', 'Cucumber'],
        description: 'Protein-rich, sugar-free meal.',
        mealType: 'DIABETIC'
    },

    // ================= BABY =================
    {
        id: 'B1',
        name: 'Rice & Moong Dal Mash',
        ingredients: ['Rice', 'Moong Dal'],
        description: 'Soft, easily digestible baby food.',
        mealType: 'BABY'
    },
    {
        id: 'B2',
        name: 'Vegetable Puree',
        ingredients: ['Pumpkin', 'Bottle Gourd'],
        description: 'Smooth puree with no added salt or spices.',
        mealType: 'BABY'
    },
    {
        id: 'B3',
        name: 'Fruit Mash',
        ingredients: ['Apple', 'Banana'],
        description: 'Naturally sweet mashed fruits.',
        mealType: 'BABY'
    }
]


export default function MealSelector() {
    const { t } = useTranslation()
    const [step, setStep] = useState(1) // 1: Type, 2: Dish, 3: Customise
    const [selectedType, setSelectedType] = useState(null)
    const [selectedDish, setSelectedDish] = useState(null)
    const [avoidedIngredients, setAvoidedIngredients] = useState([])
    const [searchTerm, setSearchTerm] = useState('')

    // 1. Filter Dishes available for the selected Meal Type
    const filteredDishes = useMemo(() => {
        if (!selectedType) return []
        const dishesOfType = DISHES.filter(dish => dish.mealType === selectedType)
        if (!searchTerm) return dishesOfType

        const term = searchTerm.toLowerCase()
        return dishesOfType.filter(dish =>
            dish.name.toLowerCase().includes(term) ||
            dish.ingredients.some(ing => ing.toLowerCase().includes(term))
        )
    }, [selectedType, searchTerm])

    // 2. Identify forbidden ingredients from the selected dish based on meal rules
    const jainForbidden = ['Onion', 'Garlic', 'Potato', 'Ginger']

    const getIngredientStatus = (ing) => {
        if (selectedType === 'JAIN' && jainForbidden.some(f => ing.toLowerCase().includes(f.toLowerCase()))) {
            return 'FORBIDDEN'
        }
        return 'NORMAL'
    }

    const toggleAvoid = (ing) => {
        if (getIngredientStatus(ing) === 'FORBIDDEN') return
        if (avoidedIngredients.includes(ing)) {
            setAvoidedIngredients(prev => prev.filter(i => i !== ing))
        } else {
            setAvoidedIngredients(prev => [...prev, ing])
        }
    }

    const reset = () => {
        setStep(1)
        setSelectedType(null)
        setSelectedDish(null)
        setAvoidedIngredients([])
        setSearchTerm('')
    }

    return (
        <div className="max-w-4xl mx-auto min-h-[600px] flex flex-col animate-in fade-in duration-700">
            {/* Navigation Header */}
            <div className="flex items-center justify-between mb-8 px-4">
                <div className="flex items-center gap-4">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <FiChevronLeft className="w-6 h-6 text-gray-500" />
                        </button>
                    )}
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                        {t('meal_selector.configurator')}
                    </h2>
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= i ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                </div>
            </div>

            {/* STEP 1: Select Meal Type */}
            {step === 1 && (
                <div className="space-y-8 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="text-center">
                        <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">
                            {t('meal_selector.step_x_of_y', { step: 1, total: 3 })}
                        </p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{t('meal_selector.dietary_blueprint')}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {CORE_MEAL_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => { setSelectedType(type.id); setStep(2); }}
                                className="group relative flex flex-col items-center p-8 rounded-[2rem] border-2 border-gray-50 dark:border-gray-900 hover:border-indigo-600 hover:bg-indigo-50/10 transition-all duration-300"
                            >
                                <span className="text-5xl mb-4 transform transition-transform group-hover:scale-110">{type.icon}</span>
                                <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">
                                    {t(`meal_selector.${type.id}`)}
                                </span>
                                <div className="absolute top-4 right-4 text-gray-300 group-hover:text-indigo-600 transition-colors">
                                    <FiArrowRight className="w-6 h-6" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2: Select Dish */}
            {step === 2 && (
                <div className="space-y-8">
                    <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider opacity-70 mb-1">{t('meal_selector.active_preference')}</p>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                {CORE_MEAL_TYPES.find(t => t.id === selectedType).icon} {t(`meal_selector.${selectedType}`)}
                            </h3>
                        </div>
                        <FiShield className="w-8 h-8 opacity-20" />
                    </div>

                    <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('meal_selector.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredDishes.map(dish => (
                            <div
                                key={dish.id}
                                onClick={() => { setSelectedDish(dish); setStep(3); setAvoidedIngredients([]); }}
                                className="group bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
                            >
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{dish.name}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">{dish.description}</p>
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {dish.ingredients.slice(0, 3).map(ing => (
                                            <span key={ing} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                                                {ing}
                                            </span>
                                        ))}
                                        {dish.ingredients.length > 3 && <span className="text-[10px] text-gray-400">+{dish.ingredients.length - 3} more</span>}
                                    </div>
                                </div>
                                <div className="flex items-center text-indigo-600 font-bold text-xs uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                                    {t('meal_selector.select_customise')} <FiArrowRight className="ml-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredDishes.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-gray-500">{t('meal_selector.no_dishes')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 3: Customize Ingredients */}
            {step === 3 && selectedDish && (
                <div className="space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                        {/* Selected Dish Hero */}
                        <div className="bg-indigo-600 p-10 sm:p-12 text-white">
                            <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">{selectedDish.name}</h3>
                            <p className="text-indigo-100 text-sm max-w-lg leading-relaxed">{selectedDish.description}</p>
                        </div>

                        {/* Ingredient Avoidance Lab */}
                        <div className="p-10 sm:p-12 bg-gray-50/50 dark:bg-gray-900/30">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-xl text-rose-600">
                                    <FiSlash className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">{t('meal_selector.avoid_title')}</h4>
                                    <p className="text-xs text-gray-500">{t('meal_selector.avoid_subtitle')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {selectedDish.ingredients.map(ing => {
                                    const status = getIngredientStatus(ing)
                                    const isAvoided = avoidedIngredients.includes(ing)

                                    return (
                                        <button
                                            key={ing}
                                            onClick={() => toggleAvoid(ing)}
                                            className={`relative p-5 rounded-[1.5rem] border-2 transition-all flex items-center justify-between font-bold text-sm ${status === 'FORBIDDEN'
                                                ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/40 text-rose-600 cursor-not-allowed opacity-60'
                                                : isAvoided
                                                    ? 'bg-rose-600 border-rose-600 text-white shadow-lg'
                                                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300'
                                                }`}
                                        >
                                            <span className="truncate pr-2">{ing}</span>
                                            {status === 'FORBIDDEN' ? (
                                                <FiAlertTriangle className="shrink-0" />
                                            ) : isAvoided ? (
                                                <FiX className="shrink-0" />
                                            ) : (
                                                <FiPlus className="shrink-0 opacity-20" />
                                            )}
                                            {status === 'FORBIDDEN' && (
                                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-600 text-[8px] text-white px-2 py-0.5 rounded-full uppercase">{t('meal_selector.forbidden')}</span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Final Checkout */}
                    <div className="bg-gray-900 dark:bg-black p-8 rounded-[2.5rem] shadow-2xl flex flex-col sm:flex-row items-center justify-between">
                        <div className="flex items-center gap-6 mb-6 sm:mb-0">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl">
                                👜
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">{t('meal_selector.final_selection')}</p>
                                <h4 className="text-white text-xl font-bold">{selectedDish.name}</h4>
                                <p className="text-white/60 text-xs mt-1">
                                    {avoidedIngredients.length > 0
                                        ? t('meal_selector.excluding', { items: avoidedIngredients.join(', ') })
                                        : t('meal_selector.no_exclusions')}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={reset} className="px-6 py-4 rounded-2xl font-bold text-sm text-white/60 hover:text-white transition-colors">
                                {t('meal_selector.cancel')}
                            </button>
                            <button className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-[0_10px_30px_rgba(79,70,229,0.3)] transition-all">
                                {t('meal_selector.confirm_book')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
