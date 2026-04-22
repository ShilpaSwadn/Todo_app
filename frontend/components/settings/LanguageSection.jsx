'use client'

import DynamicProfileForm from '@/components/DynamicProfileForm'

export default function LanguageSection({ config, data, onChange }) {
  return (
    <DynamicProfileForm
      categories={config.categories}
      data={data}
      onChange={onChange}
    />
  )
}
