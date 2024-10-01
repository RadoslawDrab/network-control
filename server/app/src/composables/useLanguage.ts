import { computed, onMounted, ref, watch } from 'vue';

import languageFile from 'public/language.json';

export type Language = 'en' | 'pl';

export const defaultModifiersObject: ModifierObject<'!' | ';' | '^'> = {
  '!': (text) => text.toUpperCase(),
  ';': (text) => text.toLowerCase(),
  '^': (text) => text.trimStart()[0].toUpperCase() + text.trimStart().substring(1),
};

const useLanguage = <
  ExtendedId extends string = Keys<typeof languageFile.labels, false>,
  Modifier extends string = keyof typeof defaultModifiersObject
>(
  modifierObject: ModifierObject<Modifier> = defaultModifiersObject as ModifierObject<Modifier>
) => {
  type Id = RemoveString<ExtendedId, '.default'>;
  type TemplateId = TranslateTemplate<Id>;
  type IdModifierPrefix = Prefix<Id, Modifier>;

  const storageKey = `${document.location.origin}/language`;
  const options = ref<Required<TranslationOptions<Id>>>({
    languages: ['en', 'pl'],
    template: '##TEMPLATE##',
    fallbackText: 'NOT_FOUND',
    attributeName: 'translate',
    attributes: ['aria-label'],
    labels: null,
    ...(languageFile as Partial<TranslationOptions<Id>>),
  });

  const language = ref<Language>((sessionStorage.getItem(storageKey) as Language) ?? getBrowserLanguage());

  const attributeName = computed(() => options.value.attributeName);
  const languageIndex = computed(() => options.value.languages.findIndex((l) => language.value === l));
  const labels = computed(
    () =>
      getKeys(options.value.labels as Labels<Id>, true).reduce(
        (obj, key) => ({ ...obj, [key.replace(/\.default$/, '')]: _getElement(key) }),
        {}
      ) as Record<Id, string[]>
  );
  const template = computed(() => {
    const opt = {
      prefix: options.value.template.match(/.*(?=TEMPLATE)/).at(0) || '##',
      suffix: options.value.template.match(/(?<=TEMPLATE).*/).at(0) || '##',
    };
    const mod = modifiers.value.keys.reduce((str, m) => (str += `|\\${m}`), '');

    return {
      ...opt,
      modifiersRegEx: new RegExp(`[${mod}]`),
      checkRegEx: new RegExp(`${options.value.template.replace('TEMPLATE', `([\\w_\\-\\.]${mod}){1,}`)}`, 'gi'),
      prefixRegEx: new RegExp(`^${opt.prefix}`),
      suffixRegEx: new RegExp(`${opt.suffix}$`),
    };
  });
  const modifiers = computed(() => {
    return {
      keys: Object.keys(modifierObject),
      modifiers: modifierObject,
    };
  });

  watch(
    language,
    (lang) => {
      document.documentElement.lang = lang;

      sessionStorage.setItem(storageKey, lang);
    },
    { immediate: true }
  );

  onMounted(() => {
    const mutationObserver = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        const target = mutation.target as HTMLElement;
        translateNodes(target);
      }
    });

    mutationObserver.observe(document.documentElement, { attributeFilter: ['lang'] });
    mutationObserver.observe(document.body, { subtree: true, attributes: true });

    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        translateNodes([...mutation.addedNodes] as HTMLElement[]);
      }
    }).observe(document.body, { childList: true, subtree: true });

    function translateNodes(target: HTMLElement | HTMLElement[]) {
      const targets = Array.isArray(target) ? target : [target];

      for (const target of targets) {
        const textNodes = getNodes(target, Node.TEXT_NODE)
          .filter((n) => n.textContent && n.textContent.match(template.value.checkRegEx))
          .map((el) => {
            el.parentElement.dataset[attributeName.value] = el.textContent;
            return el.parentElement;
          });

        translateElements(...getNodes(target), ...textNodes);
      }
      function getNodes<T extends Node>(node: T, nodeType?: number, nodes: T[] = []): T[] {
        // @ts-ignore
        const children = node.childNodes as T[];
        nodes.push(...children);
        for (const child of children) {
          getNodes(child, nodeType, nodes);
        }
        return nodes.filter((n) => (nodeType ? n.nodeType === nodeType : true));
      }
      function translateElements(...elements: HTMLElement[]) {
        // All elements which include translation data attribute or custom attribute
        const filteredElements = elements.filter((el) => {
          if (el.dataset || el.querySelector) {
            return (
              el.dataset[attributeName.value] ||
              el.querySelector(`[data-${attributeName.value}]`) ||
              options.value.attributes.some((attr) => el.querySelector(`[${attr}-${attributeName.value}]`))
            );
          }
          return false;
        });

        for (let el of filteredElements) {
          // Translates current element
          if (el.dataset[attributeName.value]) {
            translateElement(el);
          }

          const childElements = el.querySelectorAll<HTMLElement>(`[data-${attributeName.value}]`);

          // Translates all child elements
          childElements.forEach((el) => translateElement(el));

          options.value.attributes.forEach((attr) => {
            const attribute = `${attr}-${attributeName.value}`;

            const attributeElements = [...el.querySelectorAll<HTMLElement>(`[${attribute}]`)];

            if (el.getAttribute(attribute)) attributeElements.push(el);

            // Translates all custom in childs attributes
            attributeElements.forEach((el) => {
              translateElement(el, {
                name: attr,
                value: el.getAttribute(attribute),
              });
            });
          });
        }
      }
    }
    function translateElement(el: HTMLElement, attribute?: { name: string; value: string }) {
      const isId = !attribute && Object.keys(labels.value).includes(el.dataset.translate);

      if (isId) {
        t(el.dataset.translate);
        return;
      }

      t(attribute ? attribute.value : el.dataset.translate);

      function t(text: string) {
        const value: string | null = isId ? translate(text as Id) : translateText(text);

        if (value) {
          // Sets attribute
          if (attribute) el.setAttribute(attribute.name, attribute.value.replace(text, value));
          // Sets text content
          else el.textContent = value;

          return;
        }

        // Replaces text content if no translation is found
        if (el.textContent === '' || el.textContent.match(template.value.checkRegEx)) {
          el.textContent = options.value.fallbackText;
        }
      }
    }
  });

  function getBrowserLanguage(): Language {
    const language = navigator.language.split('-')[0];
    return options.value.languages.find((l) => l === language) ?? 'en';
  }
  function isCurrentLanguage(lang: Language) {
    return language.value === lang;
  }
  function translate(id: Id | TemplateId): string | null {
    if (options.value.labels) {
      const templateIds = getTemplateIds(id);
      const newId = templateIds.length > 0 ? templateIds[0] : id;

      // Gets translation values based on `id`
      const values: string[] | null =
        labels.value[
          newId
            .replace(template.value.prefixRegEx, '')
            .replace(template.value.suffixRegEx, '')
            .replace(template.value.modifiersRegEx, '')
        ];
      if (values && values.length > 0) {
        // Returns translation
        const value = values[languageIndex.value] ?? null;
        const mods = newId.replace(template.value.prefixRegEx, '').match(template.value.modifiersRegEx);
        // Applies mods
        if (mods && mods.length > 0) {
          return mods.reduce((text, mod) => modifiers.value.modifiers[mod](text), value);
        }
        return value;
      }
    }
    return null;
  }
  function translateText(text: string): string {
    if (options.value.labels) {
      const templateIds = getTemplateIds(text);

      if (templateIds.length === 0) {
        return translate(text as Id) ?? options.value.fallbackText;
      }
      return templateIds.reduce((value, id) => value.replace(id, translate(id) ?? options.value.fallbackText), text);
    }
    return text;
  }
  function setLanguage(lang: Language) {
    language.value = lang;
  }
  function getTemplateIds(str: string): TemplateId[] {
    return (str.match(template.value.checkRegEx) ?? []) as TemplateId[];
  }
  function getKeys<O extends Record<string, any>>(obj: O, withDefault: boolean = false): Keys<O>[] {
    return Object.keys(obj).reduce<Keys<O>[]>((keys, key) => {
      if (!Array.isArray(obj[key])) {
        keys.push(...getKeys(obj[key], withDefault).map((k) => (withDefault || k !== 'default' ? `${key}.${k}` : key)));
      } else {
        keys.push(key);
      }
      return keys;
    }, []);
  }
  function getElement(id: IdModifierPrefix): string {
    return translateText(id);
  }
  function _getElement(id: Id): string[] {
    return getValue(options.value.labels as Labels<Id>, id);

    function getValue<T extends Record<string, Value | T>, Value extends Array<any> = string[]>(
      obj: T,
      key: Keys<T>
    ): Value | null {
      // @ts-ignore
      return key.split('.').reduce<Value | null>((value, key) => (value && value[key] ? value[key] : null), obj);
    }
  }
  return {
    setLanguage,
    languages: options.value.languages,
    isCurrentLanguage,
    language,
    translateText,
    translate: getElement,
  };
};
export default useLanguage;

type TranslateTemplate<T extends string = 'TEMPLATE', Modifier extends string = ''> = `${string}${
  | Modifier
  | ''}${T}${string}`;
type ModifierObject<Id extends string = string> = Record<Id, (text: string) => string>;

type Prefix<S extends string, P extends string, Optional extends boolean = true> = `${Optional extends true
  ? P | ''
  : P}${S}`;

interface TranslationOptions<Id extends string = string> {
  /** Languages in order in which they are added in `language.json` */
  languages: Language[];
  /** Template for string text. Must include `TEMPLATE` keyword
   * @default "##TEMPLATE##"
   */
  template: TranslateTemplate;
  /** Fallback text when no translation is found and there is no initial text
   * @default "NOT_FOUND"
   */
  fallbackText: string;
  /**
   * Labels with translations. Each label has to be in order which is specified in `languages` property
   * @example
   * ```
   * languages: ['en', 'pl']
   * labels: {
   *   time: ["Time", "Czas"]
   * }
   * Where `time` is id
   * ```
   */
  labels: Labels<Id> | null;
  /** Attribute to search for.
   * @default translate
   */
  attributeName?: string;
  /** Attributes which will be checked.
   * @example
   * ```
   * attributes: ["aria-label"]
   * ```
   * Will check any aria-label attribute
   */
  attributes: string[];
}
type Labels<Id extends string = string> = {
  [key in Id | 'default']: string[] | Labels<Id>;
};

type NestedKeyOf<O> = O extends object & { length?: never }
  ? {
      [Key in keyof O]: `${Exclude<Key, symbol>}${NestedKeyOf<O[Key]> extends never ? '' : `.${NestedKeyOf<O[Key]>}`}`;
    }[keyof O]
  : never;

type RemoveString<Type extends string, Suffix extends string> = Split<Type, Suffix>[0];
type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ''
  ? []
  : S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S];

type Keys<Value, WithoutDefault extends boolean = true> = WithoutDefault extends true
  ? RemoveString<NestedKeyOf<Value>, '.default'>
  : NestedKeyOf<Value>;

/**
 * @param modifierObject Object which contains modifiers which transform data
 * Example language file structure:
 * @example
 * ```json
 * {
 *  "template": "##TEMPLATE##",
 *  "attributeName": "translate",
 *  "fallbackText": "NOT_FOUND"
 *  "languages": ["en", "pl"],
 *  "attributes": ["aria-label", "placeholder"]
 *  "labels": {
 *    "user": {
 *      "default": ["User", "Użytkownik"],
 *      "error": ["No user", "Brak użytkownika"]
 *    },
 *    "error": ["Error", "Błąd"]
 *  }
 * }
 * ```
 *
 * All examples are in English
 *
 * -------------------------------------
 *
 * How to use:
 * - HTML data tag
 * ```data-{attributeName}```
 * -------------------------------------
 * @example
 * This will transform to:
 * ```html
 *    <p data-translate="user">FALLBACK</p>
 * ```
 * -->
 * ```html
 *    <p data-translate="user">User</p>
 * ```
 * -------------------------------------
 * @example
 * This will not transform and return content:
 * ```html
 *    <p data-translate="users">FALLBACK</p>
 * ```
 * -->
 * ```html
 *    <p data-translate="users">FALLBACK</p>
 * ```
 * -------------------------------------
 * @example
 * This will return `fallbackText`:
 * ```html
 *    <p data-translate="users"></p>
 * ```
 * -->
 * ```html
 *    <p data-translate="users">NOT_FOUND</p>
 * ```
 * -------------------------------------
 *
 * - template text. `template` property
 * @example
 * ```html
 *    <span>##user##</span>
 * ```
 * -->
 * ```html
 *    <span>User</span>
 * ```
 * -------------------------------------
 * @example
 * JavaScript
 * ```javascript
 *    document.body.textContent = '##error##'
 * ```
 * HTML
 * ```html
 *    <body></body>
 * ```
 * -->
 * ```html
 *    <body data-translate="##error##">Error</body>
 * ```
 * -------------------------------------
 * @example
 * JavaScript
 * ```javascript
 *    document.body.textContent = '##user## ##error##?'
 * ```
 * HTML
 * ```html
 *    <body></body>
 * ```
 * -->
 * ```html
 *    <body data-translate="##user## ##error##?">User Error?</body>
 * ```
 * -------------------------------------
 * @example
 * With modifiers:
 *
 * JavaScript
 * ```javascript
 *    document.body.textContent = '##user## ##error##?'
 * ```
 * HTML
 * ```html
 *    <body></body>
 * ```
 * -->
 * ```html
 *    <body data-translate="##user## ##error##?">User Error?</body>
 * ```
 *
 * -------------------------------------
 *
 * - HTML custom attribute. `attributes` property
 * @example
 * ```html
 *    <span aria-label-translate="user"></span>
 * ```
 * -->
 * ```html
 *    <span aria-label-translate="user" aria-label="User"></span>
 * ```
 * @example
 * ```html
 *    <span aria-label-translate="##user##?"></span>
 * ```
 * -->
 * ```html
 *    <span aria-label-translate="##user##?" aria-label="User?"></span>
 * ```
 * @example
 * ```html
 *    <span aria-label-translate="##users##"></span>
 * ```
 * -->
 * ```html
 *    <span aria-label-translate="##users##" aria-label="NOT_FOUND"></span>
 * ```
 * @example
 * ```html
 *    <input placeholder-translate="user" />
 * ```
 * -->
 * ```html
 *    <input placeholder-translate="user" placeholder="User" />
 * ```
 *
 *
 * -------------------------------------
 *
 * To modify output value use before name:
 * - `!` for UPPERCASE
 * - `;` for lowercase
 * - `^` for Capitalise
 * @example
 * '##!user##' will output 'USER' instead of 'User'
 * '##!;user##' will output 'user' instead of 'User' because modifiers are applied in order from left to right
 */
export type LanguageComposable = typeof useLanguage;
