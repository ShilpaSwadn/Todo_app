'use client'

import React from 'react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

export default function DynamicProfileForm({ data, onChange, categories }) {
  const { t } = useTranslation();


  const [openSelect, setOpenSelect] = React.useState(null);
  const formRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (openSelect && formRef.current && !formRef.current.contains(event.target)) {
        setOpenSelect(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openSelect]);

  // Helper to get field value from category-grouped data
  const getFieldValue = (fieldId) => {
    // Determine category of the field
    const category = categories.find(cat => cat.fields.some(f => f.id === fieldId));
    if (!category) return data[fieldId] !== undefined ? data[fieldId] : '';

    // Core fields might be flat in 'data' or grouped, let's check both
    if (category.id === 'personal_account' && data[fieldId] !== undefined) return data[fieldId];

    // Grouped data is an array of objects for the category key
    const categoryList = data[category.id];
    if (Array.isArray(categoryList) && categoryList[0]) {
      return categoryList[0][fieldId] !== undefined ? categoryList[0][fieldId] : '';
    }

    // Fallback to flat data if not found in list (backward compatibility)
    return data[fieldId] !== undefined ? data[fieldId] : '';
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = value;

    if (type === 'number') {
      finalValue = value === '' ? '' : Number(value);
    } else if (type === 'checkbox') {
      finalValue = checked;
    }

    // Auto-logic for Jain diet
    if (name === 'dietType' && value === 'Jain') {
      const currentDisliked = Array.isArray(getFieldValue('dislikedIngredients')) ? [...getFieldValue('dislikedIngredients')] : [];
      if (!currentDisliked.includes('Onion')) currentDisliked.push('Onion');
      if (!currentDisliked.includes('Garlic')) currentDisliked.push('Garlic');
      onChange('dislikedIngredients', currentDisliked);
    }

    onChange(name, finalValue);
    setOpenSelect(null);
  };

  const handleMultiSelectChange = (name, option) => {
    const currentValues = getFieldValue(name);
    const values = Array.isArray(currentValues) ? [...currentValues] : [];
    const index = values.indexOf(option);
    if (index === -1) {
      values.push(option);
    } else {
      values.splice(index, 1);
    }
    onChange(name, values);
  };

  // Helper to check if a field's dependency is met
  const isDependencyMet = (field) => {
    if (!field.dependsOn) return true;
    const { field: depField, values: depValues } = field.dependsOn;
    const currentValue = getFieldValue(depField);
    return depValues.includes(currentValue);
  };

  // Helper to filter options based on other choices
  const getFilteredOptions = (field) => {
    if (!field.options) return [];
    let options = [...field.options];

    if (field.id === 'allowedMeats') {
      if (data.religiousRestrictions === 'Halal') options = options.filter(o => o !== 'Pork');
      if (data.religiousRestrictions === 'Kosher') options = options.filter(o => o !== 'Pork' && o !== 'Shellfish');
      if (data.religiousRestrictions === 'Hindu') options = options.filter(o => o !== 'Beef');
      if (data.dietType === 'Eggetarian') options = options.filter(o => o === 'None');
    }

    return options;
  };

  return (
    <div ref={formRef} className="flex flex-col gap-12 sm:gap-20 pb-40">
      {categories.map((category) => {
        const hasOpenSelect = category.fields.some(f => f.id === openSelect);
        return (
          <section
            key={category.id}
            id={category.id}
            className="bg-white dark:bg-gray-800 rounded-[3rem] p-8 sm:p-14 shadow-[0_30px_70px_rgba(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-gray-800/50 scroll-mt-32 transition-all hover:translate-y-[-4px] hover:shadow-xl relative"
            style={{ zIndex: hasOpenSelect ? 50 : 1 }}
          >
            <div className="flex items-center gap-6 mb-12 sm:mb-16">
              <div className="w-2.5 h-14 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-full" />
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-[0.25em]">
                  {t('settings.categories.' + category.id, category.title)}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
              {category.fields.map((field) => {
                if (!isDependencyMet(field)) return null;

                const value = getFieldValue(field.id);
                const isReadOnly = field.isReadOnly;
                const filteredOptions = getFilteredOptions(field);

                return (
                  <div
                    key={field.id}
                    className="group relative animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ zIndex: openSelect === field.id ? 400 : 1 }}
                  >
                    <div className="flex items-center justify-between mb-4 ml-2">
                      <label
                        htmlFor={field.id}
                        className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"
                      >
                        {t('settings.fields.' + field.id, field.label)}
                      </label>
                      {isReadOnly && (
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                          {t('settings.read_only', 'Read only')}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      {field.type === 'select' ? (
                        <div className="relative">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => setOpenSelect(openSelect === field.id ? null : field.id)}
                            className={`w-full px-7 py-5 border rounded-[1.75rem] transition-all text-sm font-bold flex items-center justify-between group/sel ${isReadOnly
                                ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:text-white cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-900/50'
                              }`}
                          >
                            <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-300'}>
                              {value || (field.placeholder ? t('settings.placeholders.' + field.id, field.placeholder) : t('settings.select_field', 'Select {{field}}', { field: t('settings.fields.' + field.id, field.label) }))}
                            </span>
                            <FiChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSelect === field.id ? 'rotate-180' : ''}`} />
                          </button>


                          {/* Custom Dropdown Menu */}
                          {openSelect === field.id && !isReadOnly && (
                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] shadow-2xl z-50 max-h-[300px] overflow-y-auto py-4 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                              {filteredOptions.map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleInputChange({ target: { name: field.id, value: opt, type: 'select' } })}
                                  className={`w-full px-8 py-4 text-left text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50 ${value === opt ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : field.type === 'radio' ? (
                        <div className="flex flex-wrap gap-5 p-2">
                          {filteredOptions.map((option) => (
                            <label key={option} className="flex items-center gap-4 cursor-pointer group/radio">
                              <div className="relative flex items-center justify-center">
                                <input
                                  type="radio"
                                  name={field.id}
                                  value={option}
                                  checked={value === option}
                                  onChange={handleInputChange}
                                  disabled={isReadOnly}
                                  className="peer w-6 h-6 border-2 border-gray-200 dark:border-gray-700 rounded-full appearance-none checked:border-indigo-500 transition-all cursor-pointer"
                                />
                                <div className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full scale-0 peer-checked:scale-100 transition-transform duration-200" />
                              </div>
                              <span className={`text-sm font-bold ${isReadOnly ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300 group-hover/radio:text-indigo-500 transition-colors'}`}>
                                {option}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === 'multi-select' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-gray-50/50 dark:bg-gray-900/30 rounded-[1.75rem] border border-gray-100 dark:border-gray-800">
                          {filteredOptions.map((option) => (
                            <label key={option} className="flex items-center gap-4 cursor-pointer group/multi p-1 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all">
                              <input
                                type="checkbox"
                                checked={Array.isArray(getFieldValue(field.id)) && getFieldValue(field.id).includes(option)}
                                onChange={() => !isReadOnly && handleMultiSelectChange(field.id, option)}
                                disabled={isReadOnly}
                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
                              />
                              <span className={`text-xs font-bold ${isReadOnly ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400 group-hover/multi:text-indigo-500 transition-colors'}`}>
                                {option}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          id={field.id}
                          type={field.type}
                          name={field.id}
                          value={value}
                          onChange={handleInputChange}
                          readOnly={isReadOnly}
                          placeholder={field.placeholder ? t('settings.placeholders.' + field.id, field.placeholder) : ''}
                          min={field.min}
                          className={`w-full px-7 py-5 border rounded-[1.75rem] transition-all text-sm font-bold ${isReadOnly
                              ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:text-white hover:border-indigo-300 dark:hover:border-indigo-900/50'
                            }`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
