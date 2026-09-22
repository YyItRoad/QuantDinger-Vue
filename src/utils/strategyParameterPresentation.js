function translatedValue (translate, key) {
  if (!key || typeof translate !== 'function') return ''
  const value = translate(key)
  return value === key ? '' : value
}

export function strategyParameterLabel (param = {}, translate) {
  return translatedValue(translate, param.labelKey || param.label_key) ||
    translatedValue(translate, `strategyBuilder.params.${param.name}.label`) ||
    translatedValue(translate, `trading-assistant.templateParam.${param.name}.label`) ||
    param.label ||
    String(param.name || '').replace(/_/g, ' ')
}

export function strategyParameterDescription (param = {}, translate, locale = '') {
  const localized = translatedValue(translate, param.descriptionKey || param.description_key) ||
    translatedValue(translate, `strategyBuilder.params.${param.name}.description`) ||
    translatedValue(translate, `trading-assistant.templateParam.${param.name}.desc`)
  if (localized) return localized
  return String(locale || '').toLowerCase().startsWith('en') ? (param.description || '') : ''
}

export function strategyParameterOptionLabel (param = {}, option = {}, translate) {
  const value = option && typeof option === 'object' ? option.value : option
  const labelKey = option && typeof option === 'object' ? (option.labelKey || option.label_key) : ''
  return translatedValue(translate, labelKey) ||
    translatedValue(translate, `strategyBuilder.params.${param.name}.options.${value}`) ||
    (option && typeof option === 'object' ? (option.label || value) : value)
}

export function strategyParameterOptions (param = {}) {
  if (Array.isArray(param.options)) {
    return param.options.map(option => (
      option && typeof option === 'object' ? option : { value: option, label: option }
    ))
  }
  if (Array.isArray(param.values)) {
    return param.values.map(value => ({ value, label: value }))
  }
  return []
}
