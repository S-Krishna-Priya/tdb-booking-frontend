import { useLanguage } from '../i18n/context'
import { LANGUAGES, LANGUAGE_NAMES } from '../i18n/translations'

/**
 * The English / Malayalam switch.
 *
 * Native radios in a `<fieldset>`: one Tab stop for the group, arrow keys to move between the
 * options, and the change applies as soon as an option is chosen. Each option is labelled in its
 * own language and carries `lang`, so a screen reader pronounces "മലയാളം" as Malayalam even while
 * the interface is still English.
 */
export function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <fieldset className="border-0 p-0">
      <legend className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {t.language.legend}
      </legend>
      <div className="mt-1 flex items-center gap-3">
        {LANGUAGES.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-700"
          >
            <input
              type="radio"
              name="language"
              value={option}
              checked={language === option}
              onChange={() => {
                setLanguage(option)
              }}
              className="h-4 w-4 accent-amber-600"
            />
            <span lang={option}>{LANGUAGE_NAMES[option]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
